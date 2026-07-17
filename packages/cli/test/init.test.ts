import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { afterEach, describe, expect, it } from "vitest";

import {
  DEFAULT_MANIFEST_NAME,
  initializeManifest,
} from "../src/init.js";

const execFileAsync = promisify(execFile);
const temporaryDirectories: string[] = [];

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), "scopeparity-cli-"));
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

describe("initializeManifest", () => {
  it("writes a secret-free manifest template without prompting", async () => {
    const root = await temporaryDirectory();

    const manifestPath = await initializeManifest(root);
    const manifest = await readFile(manifestPath, "utf8");

    expect(manifestPath).toBe(path.join(root, DEFAULT_MANIFEST_NAME));
    expect(manifest).toContain("schemaVersion: 1");
    expect(manifest).toContain("publicUrls: false");
    expect(manifest).toContain("Never add client IDs, client secrets, tokens");
    expect(manifest).not.toContain("clientSecret:");
  });

  it("refuses to overwrite an existing manifest", async () => {
    const root = await temporaryDirectory();
    await initializeManifest(root);

    await expect(initializeManifest(root)).rejects.toThrow(
      "Refusing to overwrite existing manifest",
    );
  });

  it("rejects a missing project root", async () => {
    const parent = await temporaryDirectory();
    const missingRoot = path.join(parent, "missing");

    await expect(initializeManifest(missingRoot)).rejects.toThrow(
      "Project root does not exist",
    );
  });
});

describe("doctor support", () => {
  it("can initialize inside a real Git work tree", async () => {
    const root = await temporaryDirectory();
    await execFileAsync("git", ["init", "--quiet", root]);

    await expect(initializeManifest(root)).resolves.toBe(
      path.join(root, DEFAULT_MANIFEST_NAME),
    );
  });
});
