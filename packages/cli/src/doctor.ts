import { execFile } from "node:child_process";
import { access, stat } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import { DEFAULT_MANIFEST_NAME } from "./init.js";

const execFileAsync = promisify(execFile);

export interface DoctorCheck {
  readonly label: string;
  readonly status: "pass" | "fail" | "note";
  readonly detail: string;
}

export interface DoctorResult {
  readonly root: string;
  readonly checks: readonly DoctorCheck[];
  readonly healthy: boolean;
}

export async function inspectEnvironment(rootInput: string): Promise<DoctorResult> {
  const root = path.resolve(rootInput);
  const checks: DoctorCheck[] = [];

  const nodeMajor = Number.parseInt(process.versions.node.split(".")[0] ?? "0", 10);
  checks.push({
    label: "Node.js",
    status: nodeMajor >= 22 ? "pass" : "fail",
    detail:
      nodeMajor >= 22
        ? `${process.versions.node} (supported)`
        : `${process.versions.node} (ScopeParity requires Node.js 22 or newer)`,
  });

  let rootIsDirectory = false;
  try {
    rootIsDirectory = (await stat(root)).isDirectory();
  } catch {
    rootIsDirectory = false;
  }
  checks.push({
    label: "Project root",
    status: rootIsDirectory ? "pass" : "fail",
    detail: rootIsDirectory ? root : `Directory not found: ${root}`,
  });

  let gitAvailable = false;
  try {
    const { stdout } = await execFileAsync("git", ["--version"]);
    gitAvailable = true;
    checks.push({
      label: "Git",
      status: "pass",
      detail: stdout.trim(),
    });
  } catch {
    checks.push({
      label: "Git",
      status: "fail",
      detail: "git is required because scans use tracked files only",
    });
  }

  if (rootIsDirectory && gitAvailable) {
    try {
      const { stdout } = await execFileAsync("git", [
        "-C",
        root,
        "rev-parse",
        "--is-inside-work-tree",
      ]);
      checks.push({
        label: "Tracked-file boundary",
        status: stdout.trim() === "true" ? "pass" : "fail",
        detail:
          stdout.trim() === "true"
            ? "Git work tree found; scans can stay inside git ls-files"
            : "No Git work tree found",
      });
    } catch {
      checks.push({
        label: "Tracked-file boundary",
        status: "fail",
        detail: "No Git work tree found at the project root",
      });
    }
  }

  const manifestPath = path.join(root, DEFAULT_MANIFEST_NAME);
  let manifestExists = false;
  if (rootIsDirectory) {
    try {
      await access(manifestPath);
      manifestExists = true;
    } catch {
      manifestExists = false;
    }
  }
  checks.push({
    label: "Manifest",
    status: manifestExists ? "pass" : "note",
    detail: manifestExists
      ? manifestPath
      : `Not created yet; run scopeparity init ${root}`,
  });

  checks.push({
    label: "Credential boundary",
    status: "pass",
    detail: "No client ID, secret, token, service-account data, or Google Cloud access is requested",
  });

  return {
    root,
    checks,
    healthy: !checks.some((check) => check.status === "fail"),
  };
}

export function formatDoctorResult(result: DoctorResult): string {
  const rows = result.checks.map((check) => {
    const marker = check.status === "pass" ? "PASS" : check.status === "fail" ? "FAIL" : "NOTE";
    return `[${marker}] ${check.label}: ${check.detail}`;
  });

  return [
    "ScopeParity doctor",
    `Project: ${result.root}`,
    "",
    ...rows,
    "",
    result.healthy
      ? "Ready for a local, credential-free scan."
      : "Resolve the failed checks before scanning.",
    "",
  ].join("\n");
}
