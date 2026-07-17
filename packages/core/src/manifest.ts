import { readFile } from "node:fs/promises";
import path from "node:path";

import { parse } from "yaml";
import { z } from "zod";

import { normalizeScope } from "./catalog.js";
import type { OAuthEvidenceManifest } from "./types.js";

const MAX_MANIFEST_BYTES = 256 * 1024;
const secretKeyPattern =
  /^(?:client_?id|client_?secret|access_?token|refresh_?token|id_?token|private_?key|service_?account|credentials?|password|api_?key)$/iu;

const httpsUrl = z
  .string()
  .trim()
  .url()
  .refine((value) => new URL(value).protocol === "https:", "must use HTTPS");

const scope = z
  .string()
  .trim()
  .min(1)
  .max(300)
  .transform(normalizeScope);

const domain = z
  .string()
  .trim()
  .min(1)
  .max(253)
  .transform((value) => value.replace(/^\.+|\.+$/gu, "").toLowerCase())
  .refine((value) => !value.includes(":") && !value.includes("/"), "must be a hostname");

const manifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    app: z
      .object({
        name: z.string().trim().min(1).max(120),
        supportEmailDomain: domain,
        homepageUrl: httpsUrl,
        privacyPolicyUrl: httpsUrl,
      })
      .strict(),
    oauth: z
      .object({
        authorizedDomains: z.array(domain).min(1).max(50),
        redirectUris: z.array(httpsUrl).min(1).max(100),
        declaredScopes: z.array(scope).min(1).max(200),
      })
      .strict(),
    features: z
      .array(
        z
          .object({
            name: z.string().trim().min(1).max(160),
            route: z.string().trim().min(1).max(500),
            scopes: z.array(scope).min(1).max(50),
          })
          .strict(),
      )
      .max(200),
    evidence: z
      .object({
        domainOwnershipVerified: z.boolean(),
        video: z
          .object({
            completed: z.boolean(),
            steps: z
              .array(
                z
                  .object({
                    title: z.string().trim().min(1).max(240),
                    route: z.string().trim().min(1).max(500),
                    scopes: z.array(scope).min(1).max(50),
                  })
                  .strict(),
              )
              .max(300),
          })
          .strict(),
      })
      .strict(),
    checks: z
      .object({
        publicUrls: z.boolean(),
      })
      .strict(),
  })
  .strict()
  .transform((value) => ({
    ...value,
    oauth: {
      ...value.oauth,
      authorizedDomains: [...new Set(value.oauth.authorizedDomains)],
      redirectUris: [...new Set(value.oauth.redirectUris)],
      declaredScopes: [...new Set(value.oauth.declaredScopes)],
    },
  }));

function findForbiddenKey(value: unknown, trail: string[] = []): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) {
      const found = findForbiddenKey(item, [...trail, String(index)]);
      if (found) return found;
    }
    return undefined;
  }

  for (const [key, item] of Object.entries(value)) {
    if (secretKeyPattern.test(key)) return [...trail, key].join(".");
    const found = findForbiddenKey(item, [...trail, key]);
    if (found) return found;
  }
  return undefined;
}

export function parseManifest(source: string): OAuthEvidenceManifest {
  if (Buffer.byteLength(source, "utf8") > MAX_MANIFEST_BYTES) {
    throw new Error(`Manifest exceeds ${MAX_MANIFEST_BYTES} bytes`);
  }

  let parsed: unknown;
  try {
    parsed = parse(source, { maxAliasCount: 0, prettyErrors: true });
  } catch (error) {
    throw new Error(`Manifest YAML is invalid: ${String(error)}`, { cause: error });
  }

  const forbiddenKey = findForbiddenKey(parsed);
  if (forbiddenKey) {
    throw new Error(
      `Manifest contains forbidden credential field "${forbiddenKey}". ScopeParity never needs credentials.`,
    );
  }

  const result = manifestSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Manifest validation failed:\n${z.prettifyError(result.error)}`);
  }
  return result.data as OAuthEvidenceManifest;
}

export async function loadManifest(manifestPath: string): Promise<OAuthEvidenceManifest> {
  const resolved = path.resolve(manifestPath);
  const source = await readFile(resolved, "utf8");
  return parseManifest(source);
}
