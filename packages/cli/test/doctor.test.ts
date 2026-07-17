import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { afterEach, describe, expect, it } from "vitest";

import { formatDoctorResult, inspectEnvironment } from "../src/doctor.js";
import { initializeManifest } from "../src/init.js";

const execFileAsync = promisify(execFile);
const temporaryDirectories: string[] = [];

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), "scopeparity-doctor-"));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("inspectEnvironment", () => {
  it("reports a healthy credential-free project", async () => {
    const root = await temporaryDirectory();
    await execFileAsync("git", ["init", "--quiet", root]);
    await initializeManifest(root);

    const result = await inspectEnvironment(root);
    const output = formatDoctorResult(result);

    expect(result.healthy).toBe(true);
    expect(output).toContain("[PASS] Tracked-file boundary");
    expect(output).toContain("[PASS] Manifest");
    expect(output).toContain("No client ID, secret, token");
  });

  it("fails clearly when the project root is missing", async () => {
    const parent = await temporaryDirectory();
    const result = await inspectEnvironment(path.join(parent, "missing"));

    expect(result.healthy).toBe(false);
    expect(formatDoctorResult(result)).toContain("[FAIL] Project root");
  });
});
