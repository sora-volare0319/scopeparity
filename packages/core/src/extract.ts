import { readFile } from "node:fs/promises";
import path from "node:path";

import { classifyScope, GOOGLE_SCOPE_CATALOG_URL, normalizeScope } from "./catalog.js";
import type { ScopeInventoryItem, SourceLocation } from "./types.js";

const fullScopePattern =
  /https:\/\/(?:www\.googleapis\.com\/auth\/[A-Za-z0-9._/-]+|mail\.google\.com\/?)/gu;
const identityLiteralPattern = /["'`](openid|email|profile)["'`]/gu;
const oauthContextPattern = /(?:google|oauth|authori[sz]|scopes?)/iu;

function safeRelativePath(value: string): string {
  return value.replace(/[\u0000-\u001f\u007f-\u009f]/gu, "�");
}

export async function extractScopes(
  rootInput: string,
  files: string[],
): Promise<ScopeInventoryItem[]> {
  const root = path.resolve(rootInput);
  const locationsByScope = new Map<string, SourceLocation[]>();

  for (const file of files) {
    const source = await readFile(path.resolve(root, ...file.split("/")), "utf8");
    const lines = source.split(/\r?\n/u);
    for (const [lineIndex, line] of lines.entries()) {
      for (const match of line.matchAll(fullScopePattern)) {
        const scope = normalizeScope(match[0]);
        const locations = locationsByScope.get(scope) ?? [];
        locations.push({ path: safeRelativePath(file), line: lineIndex + 1 });
        locationsByScope.set(scope, locations);
      }

      const context = lines
        .slice(Math.max(0, lineIndex - 2), Math.min(lines.length, lineIndex + 3))
        .join(" ");
      if (!oauthContextPattern.test(context)) continue;
      for (const match of line.matchAll(identityLiteralPattern)) {
        const scope = normalizeScope(match[1] ?? "");
        if (!scope) continue;
        const locations = locationsByScope.get(scope) ?? [];
        locations.push({ path: safeRelativePath(file), line: lineIndex + 1 });
        locationsByScope.set(scope, locations);
      }
    }
  }

  return [...locationsByScope.entries()]
    .map(([scope, locations]) => ({
      scope,
      classification: classifyScope(scope),
      locations: locations
        .filter(
          (location, index, all) =>
            all.findIndex((candidate) => candidate.path === location.path && candidate.line === location.line) ===
            index,
        )
        .sort((a, b) => a.path.localeCompare(b.path) || a.line - b.line),
      sourceUrl: GOOGLE_SCOPE_CATALOG_URL,
    }))
    .sort((a, b) => a.scope.localeCompare(b.scope));
}
