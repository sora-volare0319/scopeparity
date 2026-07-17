import { execFile } from "node:child_process";
import { lstat, readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import type { DiscoveredFiles, Finding } from "./types.js";

const execFileAsync = promisify(execFile);
const MAX_SOURCE_BYTES = 2 * 1024 * 1024;

const allowedExtensions = new Set([
  ".cjs",
  ".cs",
  ".cts",
  ".go",
  ".gradle",
  ".java",
  ".js",
  ".json",
  ".jsx",
  ".kt",
  ".kts",
  ".mjs",
  ".mts",
  ".php",
  ".properties",
  ".py",
  ".rb",
  ".rs",
  ".swift",
  ".toml",
  ".ts",
  ".tsx",
  ".xml",
  ".yaml",
  ".yml",
]);

const forbiddenNamePattern =
  /(?:^|[._-])(?:env|credential|credentials|secret|secrets|private[-_]?key|service[-_]?account)(?:[._-]|$)|^\.npmrc$/iu;

function stripControlCharacters(value: string): string {
  return value.replace(/[\u0000-\u001f\u007f-\u009f]/gu, "�");
}

function safetyFinding(pathValue: string, reason: string): Finding {
  return {
    ruleId: "FILE_SKIPPED_BY_SAFETY_BOUNDARY",
    severity: "manual",
    blocking: false,
    category: "safety",
    title: "A tracked file was skipped by the safety boundary.",
    message: reason,
    remediation: "Confirm that OAuth scope configuration is not hidden in the skipped file.",
    evidence: [stripControlCharacters(pathValue)],
    sourceUrl: "https://github.com/sora-volare0319/scopeparity/blob/main/SECURITY.md",
  };
}

function isInside(parent: string, child: string): boolean {
  const relative = path.relative(parent, child);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== "..");
}

function isBinary(buffer: Buffer): boolean {
  const sample = buffer.subarray(0, Math.min(buffer.length, 8_192));
  return sample.includes(0);
}

type GitEntry = { mode: string; repoPath: string };

function parseGitEntries(stdout: string): GitEntry[] {
  return stdout
    .split("\0")
    .filter(Boolean)
    .flatMap((record) => {
      const tab = record.indexOf("\t");
      if (tab < 0) return [];
      const metadata = record.slice(0, tab).split(" ");
      const mode = metadata[0];
      if (!mode) return [];
      return [{ mode, repoPath: record.slice(tab + 1) }];
    });
}

export async function discoverTrackedFiles(rootInput: string): Promise<DiscoveredFiles> {
  const requestedRoot = await realpath(path.resolve(rootInput));
  const { stdout: topLevelStdout } = await execFileAsync(
    "git",
    ["-C", requestedRoot, "rev-parse", "--show-toplevel"],
    { encoding: "utf8", maxBuffer: 1024 * 1024 },
  );
  const repositoryRoot = await realpath(topLevelStdout.trim());
  if (!isInside(repositoryRoot, requestedRoot)) {
    throw new Error("Requested scan root is outside the Git repository");
  }

  const prefix = path.relative(repositoryRoot, requestedRoot).split(path.sep).join("/");
  const args = ["-C", repositoryRoot, "ls-files", "--stage", "-z"];
  if (prefix) args.push("--", `${prefix}/`);
  const { stdout } = await execFileAsync("git", args, {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });

  const files: string[] = [];
  const safetyFindings: Finding[] = [];
  for (const entry of parseGitEntries(stdout)) {
    const relativeToScanRoot = prefix
      ? path.posix.relative(prefix, entry.repoPath)
      : entry.repoPath;
    if (!relativeToScanRoot || relativeToScanRoot.startsWith("../")) continue;

    if (entry.mode === "160000") {
      safetyFindings.push(safetyFinding(relativeToScanRoot, "Git submodules are never scanned."));
      continue;
    }

    const basename = path.posix.basename(relativeToScanRoot);
    const extension = path.posix.extname(basename).toLowerCase();
    if (!allowedExtensions.has(extension) || forbiddenNamePattern.test(basename)) continue;

    const absolutePath = path.resolve(requestedRoot, ...relativeToScanRoot.split("/"));
    if (!isInside(requestedRoot, absolutePath)) {
      safetyFindings.push(safetyFinding(relativeToScanRoot, "Path resolves outside the scan root."));
      continue;
    }

    const metadata = await lstat(absolutePath).catch(() => undefined);
    if (!metadata) continue;
    if (metadata.isSymbolicLink()) {
      safetyFindings.push(safetyFinding(relativeToScanRoot, "Symbolic links are never followed."));
      continue;
    }
    if (!metadata.isFile()) continue;

    const fileStat = await stat(absolutePath);
    if (fileStat.size > MAX_SOURCE_BYTES) {
      safetyFindings.push(
        safetyFinding(relativeToScanRoot, `File exceeds the ${MAX_SOURCE_BYTES}-byte source limit.`),
      );
      continue;
    }

    const resolvedPath = await realpath(absolutePath);
    if (!isInside(requestedRoot, resolvedPath)) {
      safetyFindings.push(safetyFinding(relativeToScanRoot, "Resolved path is outside the scan root."));
      continue;
    }

    const buffer = await readFile(absolutePath);
    if (isBinary(buffer)) {
      safetyFindings.push(safetyFinding(relativeToScanRoot, "Binary files are never scanned."));
      continue;
    }
    files.push(relativeToScanRoot);
  }

  return { files: files.sort(), safetyFindings };
}
