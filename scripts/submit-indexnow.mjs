import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const siteOrigin = "https://scopeparity.vercel.app";
const indexNowKey = "a0a7ac677c4328a4c7a80c939d7b0d62";
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDirectory = path.join(repositoryRoot, "apps/site/public");

const keyContents = await readFile(path.join(publicDirectory, `${indexNowKey}.txt`), "utf8");
if (keyContents.trim() !== indexNowKey) {
  throw new Error("IndexNow ownership file does not match the configured key");
}

const sitemap = await readFile(path.join(publicDirectory, "sitemap.xml"), "utf8");
const urls = [...sitemap.matchAll(/<loc>(https:\/\/[^<]+)<\/loc>/gu)].map((match) => match[1]);
if (urls.length === 0) {
  throw new Error("No URLs were found in the public sitemap");
}

for (const value of urls) {
  if (new URL(value).origin !== siteOrigin) {
    throw new Error(`Refusing to submit a URL outside ${siteOrigin}: ${value}`);
  }
}

const payload = {
  host: new URL(siteOrigin).host,
  key: indexNowKey,
  keyLocation: `${siteOrigin}/${indexNowKey}.txt`,
  urlList: urls,
};

if (process.argv.includes("--dry-run")) {
  process.stdout.write(`IndexNow payload valid: ${urls.length} canonical URLs\n`);
} else {
  const keyResponse = await fetch(payload.keyLocation);
  const liveKey = keyResponse.ok ? (await keyResponse.text()).trim() : "";
  if (liveKey !== indexNowKey) {
    throw new Error(`Live IndexNow ownership check failed with HTTP ${keyResponse.status}`);
  }

  const response = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload),
  });
  if (response.status !== 200 && response.status !== 202) {
    throw new Error(`IndexNow rejected the URL set with HTTP ${response.status}`);
  }
  process.stdout.write(`IndexNow accepted ${urls.length} canonical URLs with HTTP ${response.status}.\n`);
}
