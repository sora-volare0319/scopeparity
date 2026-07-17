import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { afterEach, describe, expect, it } from "vitest";

import { runCli } from "../src/cli.js";
import { initializeManifest } from "../src/init.js";
import type { CliIo } from "../src/io.js";

const execFileAsync = promisify(execFile);
const temporaryDirectories: string[] = [];

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), "scopeparity-e2e-"));
  temporaryDirectories.push(directory);
  return directory;
}

function memoryIo(): { io: CliIo; stdout: () => string; stderr: () => string } {
  const out: string[] = [];
  const error: string[] = [];
  return {
    io: {
      out: (message) => out.push(message),
      err: (message) => error.push(message),
    },
    stdout: () => out.join(""),
    stderr: () => error.join(""),
  };
}

async function createGitProject(source: string): Promise<string> {
  const root = await temporaryDirectory();
  const sourceDirectory = path.join(root, "src");
  await execFileAsync("git", ["init", "--quiet", root]);
  await mkdir(sourceDirectory);
  await initializeManifest(root);
  await writeFile(path.join(sourceDirectory, "auth.ts"), source, "utf8");
  await execFileAsync("git", [
    "-C",
    root,
    "add",
    "oauth-evidence.yaml",
    "src/auth.ts",
  ]);
  return root;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("CLI and core integration", () => {
  it("scans a real Git project and writes a local HTML report", async () => {
    const root = await createGitProject(
      `export const googleOAuthScopes = [\n  "openid",\n  "https://www.googleapis.com/auth/userinfo.email",\n];\n`,
    );
    const reportPath = path.join(root, "artifacts", "evidence.html");
    const output = memoryIo();

    const exitCode = await runCli(
      ["scan", root, "--format", "pretty", "--report", reportPath],
      output.io,
    );

    expect(exitCode).toBe(0);
    expect(output.stdout()).toContain("MUST FIX (0)");
    expect(output.stdout()).toContain("EVIDENCE COMPLETE (3)");
    expect(output.stdout()).toContain("this is not an approval guarantee");
    expect(output.stderr()).toBe("");
    const report = await readFile(reportPath, "utf8");
    expect(report).toContain("<!doctype html>");
    expect(report).toContain("This is not an approval or compliance certificate.");

    const jsonOutput = memoryIo();
    const jsonReportPath = path.join(root, "artifacts", "evidence.json");
    await expect(
      runCli(
        ["scan", root, "--format", "json", "--report", jsonReportPath],
        jsonOutput.io,
      ),
    ).resolves.toBe(0);
    expect(() => JSON.parse(jsonOutput.stdout())).not.toThrow();
    expect(jsonOutput.stdout()).not.toContain("Report written:");
    expect(jsonOutput.stderr()).toContain(`Report written: ${jsonReportPath}`);
  });

  it("stops at the real restricted-scope boundary with exit 1", async () => {
    const root = await createGitProject(
      `export const googleOAuthScopes = [\n  "https://www.googleapis.com/auth/drive.readonly",\n];\n`,
    );
    const output = memoryIo();

    const exitCode = await runCli(["scan", root], output.io);

    expect(exitCode).toBe(1);
    expect(output.stdout()).toContain("RESTRICTED-SCOPE BOUNDARY");
    expect(output.stdout()).toContain(
      "ScopeParity does not assess restricted scopes, CASA, policy compliance, or approval eligibility.",
    );
  });
});
