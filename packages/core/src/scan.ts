import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { RULESET_REVIEWED_AT, RULESET_VERSION } from "./catalog.js";
import { discoverTrackedFiles } from "./discovery.js";
import { extractScopes } from "./extract.js";
import { parseManifest } from "./manifest.js";
import { fetchPublicHomepage, publicCheckFailure } from "./public-check.js";
import { evaluateProject } from "./rules.js";
import type { FindingSeverity, ScanProjectOptions, ScanResult } from "./types.js";

function summarize(findings: ScanResult["findings"]): ScanResult["summary"] {
  const count = (severity: FindingSeverity) =>
    findings.filter((finding) => finding.severity === severity).length;
  return {
    blockers: count("blocker"),
    manual: count("manual"),
    complete: count("complete"),
  };
}

function relativeManifestPath(root: string, manifestPath: string): string {
  const relative = path.relative(path.resolve(root), path.resolve(manifestPath));
  if (relative === "" || relative === ".") return path.basename(manifestPath);
  if (relative === ".." || relative.startsWith(`..${path.sep}`)) {
    throw new Error("Manifest must be inside the selected scan root");
  }
  return relative.split(path.sep).join("/");
}

export async function scanProject(options: ScanProjectOptions): Promise<ScanResult> {
  const root = path.resolve(options.root);
  const manifestPath = path.resolve(options.manifestPath);
  const safeManifestPath = relativeManifestPath(root, manifestPath);
  const manifestBytes = await readFile(manifestPath);
  const manifest = parseManifest(manifestBytes.toString("utf8"));
  const discovered = await discoverTrackedFiles(root);
  const sourceFiles = discovered.files.filter((file) => file !== safeManifestPath);
  const scopes = await extractScopes(root, sourceFiles);
  const effectiveManifest =
    options.checkUrls === undefined
      ? manifest
      : { ...manifest, checks: { publicUrls: options.checkUrls } };
  const publicSurface =
    options.publicSurface ??
    (effectiveManifest.checks.publicUrls
      ? await fetchPublicHomepage(effectiveManifest.app.homepageUrl).catch(publicCheckFailure)
      : undefined);
  const evaluation = evaluateProject({
    manifest: effectiveManifest,
    scopes,
    safetyFindings: discovered.safetyFindings,
    ...(publicSurface ? { publicSurface } : {}),
  });
  const manifestDigestSha256 = createHash("sha256")
    .update(manifestBytes)
    .digest("hex");
  const reportSeed = JSON.stringify({
    ruleset: RULESET_VERSION,
    manifestPath: safeManifestPath,
    manifestDigestSha256,
    scopes,
    findings: evaluation.findings,
    storyboard: evaluation.storyboard,
  });
  const reportId = `SP-${createHash("sha256").update(reportSeed).digest("hex").slice(0, 10).toUpperCase()}`;
  return {
    product: "ScopeParity",
    rulesetVersion: RULESET_VERSION,
    rulesetReviewedAt: RULESET_REVIEWED_AT,
    reportId,
    manifestDigestSha256,
    generatedAt: new Date().toISOString(),
    manifestPath: safeManifestPath,
    scannedFiles: sourceFiles.length,
    stoppedAtRestrictedScopeBoundary: evaluation.stoppedAtRestrictedScopeBoundary,
    summary: summarize(evaluation.findings),
    scopes,
    findings: evaluation.findings,
    storyboard: evaluation.storyboard,
  };
}
