import { execFile } from "node:child_process";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { afterEach, describe, expect, it } from "vitest";

import { discoverTrackedFiles } from "../src/discovery.js";
import { extractScopes } from "../src/extract.js";
import { calendarScope } from "./helpers.js";

const execFileAsync = promisify(execFile);
const temporaryDirectories: string[] = [];

async function repository(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "scopeparity-core-"));
  temporaryDirectories.push(root);
  await execFileAsync("git", ["init", "-q", root]);
  return root;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("tracked file discovery", () => {
  it("reads only tracked, allowed, non-secret regular files", async () => {
    const root = await repository();
    await mkdir(path.join(root, "src"));
    await writeFile(path.join(root, "src", "auth.ts"), `const scopes = ["${calendarScope}"];\n`);
    await writeFile(path.join(root, "src", "untracked.ts"), `const scopes = ["${calendarScope}"];\n`);
    await writeFile(path.join(root, ".env.ts"), `const scopes = ["${calendarScope}"];\n`);
    await execFileAsync("git", ["-C", root, "add", "src/auth.ts", ".env.ts"]);

    const result = await discoverTrackedFiles(root);
    expect(result.files).toEqual(["src/auth.ts"]);
    const scopes = await extractScopes(root, result.files);
    expect(scopes).toHaveLength(1);
    expect(scopes[0]?.locations).toEqual([{ path: "src/auth.ts", line: 1 }]);
  });

  it("does not follow a tracked symlink", async () => {
    const root = await repository();
    const target = path.join(os.tmpdir(), `scopeparity-target-${Date.now()}.ts`);
    await writeFile(target, `const scopes = ["${calendarScope}"];\n`);
    await symlink(target, path.join(root, "linked.ts"));
    await execFileAsync("git", ["-C", root, "add", "linked.ts"]);

    const result = await discoverTrackedFiles(root);
    expect(result.files).toEqual([]);
    expect(result.safetyFindings[0]?.message).toMatch(/never followed/u);
    await rm(target, { force: true });
  });
});
