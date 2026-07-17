import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { afterEach, describe, expect, it } from "vitest";

import { scanProject } from "../src/scan.js";
import { manifest, writeManifest } from "./helpers.js";

const execFileAsync = promisify(execFile);
const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("scanProject", () => {
  it("does not count scope declarations inside the manifest as source evidence", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "scopeparity-scan-"));
    temporaryDirectories.push(root);
    await execFileAsync("git", ["init", "-q", root]);
    await writeFile(path.join(root, "index.ts"), "export const app = 'no oauth here';\n", "utf8");
    const manifestPath = path.join(root, "oauth-evidence.yaml");
    await writeManifest(manifestPath);
    await execFileAsync("git", ["-C", root, "add", "index.ts", "oauth-evidence.yaml"]);

    const result = await scanProject({ root, manifestPath });
    expect(result.findings.map((finding) => finding.ruleId)).toContain(
      "DECLARED_SCOPE_NOT_FOUND_IN_CODE",
    );
    expect(JSON.stringify(result)).not.toContain(root);
  });

  it("produces a stable report id for unchanged technical evidence", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "scopeparity-stable-"));
    temporaryDirectories.push(root);
    await execFileAsync("git", ["init", "-q", root]);
    await writeFile(
      path.join(root, "auth.ts"),
      'export const googleOAuthScopes = ["https://www.googleapis.com/auth/calendar.events"];\n',
      "utf8",
    );
    const manifestPath = path.join(root, "oauth-evidence.yaml");
    await writeManifest(manifestPath);
    await execFileAsync("git", ["-C", root, "add", "auth.ts", "oauth-evidence.yaml"]);

    const first = await scanProject({ root, manifestPath });
    const second = await scanProject({ root, manifestPath });
    expect(first.reportId).toBe(second.reportId);
    expect(first.manifestDigestSha256).toMatch(/^[a-f0-9]{64}$/u);
    expect(first.generatedAt).not.toBe("");

    const changedManifest = manifest();
    changedManifest.app.name = "Northstar Notes Renamed";
    await writeManifest(manifestPath, changedManifest);
    const changed = await scanProject({ root, manifestPath });
    expect(changed.manifestDigestSha256).not.toBe(first.manifestDigestSha256);
    expect(changed.reportId).not.toBe(first.reportId);
  });
});
