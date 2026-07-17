import { lookup as dnsLookup } from "node:dns/promises";
import https from "node:https";
import net from "node:net";

import type { PublicSurfaceEvidence } from "./types.js";

const MAX_REDIRECTS = 3;
const MAX_RESPONSE_BYTES = 512 * 1024;
const REQUEST_TIMEOUT_MS = 7_500;
const blockedHostnames = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata.goog",
  "instance-data",
]);

type ResolvedAddress = { address: string; family: number };
export type PublicLookup = (hostname: string) => Promise<ResolvedAddress[]>;

export class PublicUrlCheckError extends Error {
  override name = "PublicUrlCheckError";
}

function parseIpv4(address: string): number[] | undefined {
  if (net.isIP(address) !== 4) return undefined;
  const parts = address.split(".").map(Number);
  return parts.length === 4 ? parts : undefined;
}

export function isPublicIp(addressInput: string): boolean {
  const address = addressInput.toLowerCase().split("%")[0] ?? addressInput.toLowerCase();
  const ipv4 = parseIpv4(address);
  if (ipv4) {
    const [a = 0, b = 0] = ipv4;
    if (a === 0 || a === 10 || a === 127) return false;
    if (a === 100 && b >= 64 && b <= 127) return false;
    if (a === 169 && b === 254) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && [0, 2, 168].includes(b)) return false;
    if (a === 198 && (b === 18 || b === 19 || b === 51)) return false;
    if (a === 203 && b === 0) return false;
    if (a >= 224) return false;
    return true;
  }

  if (net.isIP(address) !== 6) return false;
  if (address === "::" || address === "::1") return false;
  if (address.startsWith("::ffff:")) {
    const embedded = address.slice("::ffff:".length);
    return isPublicIp(embedded);
  }
  if (address.startsWith("fc") || address.startsWith("fd")) return false;
  if (/^fe[89ab]/u.test(address)) return false;
  if (address.startsWith("ff")) return false;
  if (address.startsWith("2001:db8:")) return false;
  if (address.startsWith("2002:")) return false;
  // Global unicast is 2000::/3. Reject special/non-global ranges conservatively.
  return /^[23][0-9a-f]{3}:/u.test(address);
}

export function validatePublicHttpsUrl(urlInput: string): URL {
  let url: URL;
  try {
    url = new URL(urlInput);
  } catch (error) {
    throw new PublicUrlCheckError("Public URL is not a valid absolute URL", { cause: error });
  }
  if (url.protocol !== "https:") {
    throw new PublicUrlCheckError("Public URL checks require HTTPS");
  }
  if (url.username || url.password) {
    throw new PublicUrlCheckError("Public URL checks do not allow embedded credentials");
  }
  if (url.port && url.port !== "443") {
    throw new PublicUrlCheckError("Public URL checks allow only the standard HTTPS port");
  }
  const hostname = url.hostname.toLowerCase().replace(/\.$/u, "");
  if (
    !hostname ||
    blockedHostnames.has(hostname) ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".home.arpa")
  ) {
    throw new PublicUrlCheckError("Public URL hostname is not internet-routable");
  }
  if (net.isIP(hostname) > 0 && !isPublicIp(hostname)) {
    throw new PublicUrlCheckError("Public URL resolves to a non-public address");
  }
  url.hostname = hostname;
  url.hash = "";
  return url;
}

async function defaultLookup(hostname: string): Promise<ResolvedAddress[]> {
  return dnsLookup(hostname, { all: true, verbatim: true });
}

async function resolvePublicAddress(url: URL, lookup: PublicLookup): Promise<ResolvedAddress> {
  const literalFamily = net.isIP(url.hostname);
  const addresses = literalFamily
    ? [{ address: url.hostname, family: literalFamily }]
    : await lookup(url.hostname);
  if (addresses.length === 0) {
    throw new PublicUrlCheckError("Public URL hostname did not resolve");
  }
  if (addresses.some((entry) => !isPublicIp(entry.address))) {
    throw new PublicUrlCheckError("Public URL DNS response included a non-public address");
  }
  return addresses[0] as ResolvedAddress;
}

function requestHtml(url: URL, pinned: ResolvedAddress): Promise<{ body: string; location?: string }> {
  return new Promise((resolve, reject) => {
    const request = https.request(
      url,
      {
        method: "GET",
        agent: false,
        headers: {
          accept: "text/html,application/xhtml+xml;q=0.9,text/plain;q=0.5",
          "user-agent": "ScopeParity/0.1 public-surface-check",
        },
        lookup: (_hostname, options, callback) => {
          if (typeof options === "object" && options.all) {
            callback(null, [{ address: pinned.address, family: pinned.family }]);
            return;
          }
          callback(null, pinned.address, pinned.family);
        },
        servername: url.hostname,
      },
      (response) => {
        const status = response.statusCode ?? 0;
        const location = response.headers.location;
        if (status >= 300 && status < 400 && location) {
          response.resume();
          resolve({ body: "", location });
          return;
        }
        if (status < 200 || status >= 300) {
          response.resume();
          reject(new PublicUrlCheckError(`Public URL returned HTTP ${status}`));
          return;
        }
        const contentType = String(response.headers["content-type"] ?? "").toLowerCase();
        if (!/^(?:text\/html|application\/xhtml\+xml|text\/plain)(?:;|$)/u.test(contentType)) {
          response.resume();
          reject(new PublicUrlCheckError("Public URL did not return a supported text content type"));
          return;
        }
        const chunks: Buffer[] = [];
        let bytes = 0;
        response.on("data", (chunk: Buffer) => {
          bytes += chunk.length;
          if (bytes > MAX_RESPONSE_BYTES) {
            request.destroy(new PublicUrlCheckError("Public URL response exceeded the bounded size"));
            return;
          }
          chunks.push(chunk);
        });
        response.on("end", () => resolve({ body: Buffer.concat(chunks).toString("utf8") }));
      },
    );
    request.setTimeout(REQUEST_TIMEOUT_MS, () => {
      request.destroy(new PublicUrlCheckError("Public URL request timed out"));
    });
    request.on("error", (error) => {
      reject(
        error instanceof PublicUrlCheckError
          ? error
          : new PublicUrlCheckError("Public URL request failed", { cause: error }),
      );
    });
    request.end();
  });
}

export async function fetchPublicHomepage(
  urlInput: string,
  options: { lookup?: PublicLookup } = {},
): Promise<PublicSurfaceEvidence> {
  const lookup = options.lookup ?? defaultLookup;
  let current = validatePublicHttpsUrl(urlInput);
  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    const pinned = await resolvePublicAddress(current, lookup);
    const response = await requestHtml(current, pinned);
    if (!response.location) {
      return { homepageHtml: response.body, homepageFinalUrl: current.toString() };
    }
    if (redirect === MAX_REDIRECTS) {
      throw new PublicUrlCheckError("Public URL exceeded the redirect limit");
    }
    current = validatePublicHttpsUrl(new URL(response.location, current).toString());
  }
  throw new PublicUrlCheckError("Public URL check stopped unexpectedly");
}

export function publicCheckFailure(error: unknown): PublicSurfaceEvidence {
  const message = error instanceof Error ? error.message : "Public URL check failed";
  return { error: message.replace(/[\u0000-\u001f\u007f-\u009f]/gu, " ").slice(0, 240) };
}
