import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { runCli } from "../src/cli.js";
import type { CliIo } from "../src/io.js";

const temporaryDirectories: string[] = [];

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), "scopeparity-command-"));
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

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("runCli", () => {
  it("shows the safe local workflow when no command is given", async () => {
    const output = memoryIo();

    await expect(runCli([], output.io)).resolves.toBe(0);

    expect(output.stdout()).toContain("Usage: scopeparity");
    expect(output.stdout()).toContain("without credentials");
  });

  it("initializes once and returns input-error exit code on overwrite", async () => {
    const root = await temporaryDirectory();
    const first = memoryIo();
    const second = memoryIo();

    await expect(runCli(["init", root], first.io)).resolves.toBe(0);
    await expect(runCli(["init", root], second.io)).resolves.toBe(2);

    expect(first.stdout()).toContain("No Google client ID, secret, token");
    expect(second.stderr()).toContain("Refusing to overwrite existing manifest");
  });

  it("explains a rule without case sensitivity", async () => {
    const output = memoryIo();

    await expect(
      runCli(["explain", "scope_in_code_not_declared"], output.io),
    ).resolves.toBe(0);

    expect(output.stdout()).toContain("SCOPE_IN_CODE_NOT_DECLARED");
    expect(output.stdout()).toContain("Official source:");
  });

  it("uses exit 2 for unknown rules and unsupported credential options", async () => {
    const unknownRule = memoryIo();
    const forbiddenOption = memoryIo();

    await expect(runCli(["explain", "NOT_A_RULE"], unknownRule.io)).resolves.toBe(
      2,
    );
    await expect(
      runCli(["scan", "--client-secret", "never"], forbiddenOption.io),
    ).resolves.toBe(2);

    expect(unknownRule.stderr()).toContain("Unknown rule");
    expect(forbiddenOption.stderr()).toContain("unknown option");
  });

  it("neutralizes terminal control characters in user input", async () => {
    const output = memoryIo();

    await expect(runCli(["explain", "BAD\u001b]0;spoofed\u0007"], output.io)).resolves.toBe(2);

    expect(output.stderr()).not.toContain("\u001b");
    expect(output.stderr()).not.toContain("\u0007");
    expect(output.stderr()).toContain("BAD�]0;spoofed�");
  });

  it("uses exit 1 when doctor finds an unhealthy project", async () => {
    const parent = await temporaryDirectory();
    const output = memoryIo();

    await expect(
      runCli(["doctor", path.join(parent, "missing")], output.io),
    ).resolves.toBe(1);

    expect(output.stdout()).toContain("[FAIL] Project root");
  });
});
