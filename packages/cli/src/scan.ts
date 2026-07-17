import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  renderHtmlReport,
  renderJsonReport,
  scanProject,
} from "@scopeparity/core";
import type {
  Finding,
  ScanResult,
} from "@scopeparity/core";

import { CliInputError } from "./errors.js";

export type TerminalFormat = "pretty" | "json";

export interface ScanCommandOptions {
  readonly manifest: string;
  readonly format: TerminalFormat;
  readonly report?: string;
  readonly checkUrls?: boolean;
}

export interface ScanCommandResult {
  readonly exitCode: 0 | 1;
  readonly output: string;
  readonly reportPath?: string;
}

function formatFinding(finding: Finding): string[] {
  return [
    `- [${finding.ruleId}] ${finding.title}`,
    `  ${finding.message}`,
    ...finding.evidence.map((evidence) => `  Evidence: ${evidence}`),
    `  Next: ${finding.remediation}`,
    `  Source: ${finding.sourceUrl}`,
  ];
}

function formatGroup(
  heading: string,
  findings: readonly Finding[],
): string[] {
  return [
    `${heading} (${findings.length})`,
    ...(findings.length === 0
      ? ["- None"]
      : findings.flatMap((finding) => formatFinding(finding))),
    "",
  ];
}

export function formatPrettyReport(
  result: ScanResult,
  _manifestPath?: string,
): string {
  const mustFix = result.findings.filter(
    (finding) => finding.severity === "blocker",
  );
  const manual = result.findings.filter(
    (finding) => finding.severity === "manual",
  );
  const complete = result.findings.filter(
    (finding) => finding.severity === "complete",
  );

  return [
    "ScopeParity scan",
    "Project: selected Git working tree",
    `Manifest: ${result.manifestPath}`,
    `Tracked source files: ${result.scannedFiles}`,
    `Ruleset: ${result.rulesetVersion} (reviewed ${result.rulesetReviewedAt})`,
    "Local boundary: repository content and manifest values stayed on this device.",
    "",
    ...formatGroup("MUST FIX", mustFix),
    ...formatGroup("CONFIRM MANUALLY", manual),
    ...formatGroup("EVIDENCE COMPLETE", complete),
    ...(result.stoppedAtRestrictedScopeBoundary
      ? [
          "RESTRICTED-SCOPE BOUNDARY",
          "ScopeParity does not assess restricted scopes, CASA, policy compliance, or approval eligibility.",
          "Follow Google's restricted-scope verification and security-assessment process before continuing.",
          "",
        ]
      : []),
    result.summary.blockers === 0
      ? "No objective inconsistencies were found. Manual checks may still remain; this is not an approval guarantee."
      : `${result.summary.blockers} objective ${result.summary.blockers === 1 ? "inconsistency" : "inconsistencies"} must be resolved before submission.`,
    "",
  ].join("\n");
}

async function validateRoot(root: string): Promise<void> {
  try {
    if (!(await stat(root)).isDirectory()) {
      throw new CliInputError(`Project root is not a directory: ${root}`);
    }
  } catch (error) {
    if (error instanceof CliInputError) {
      throw error;
    }
    throw new CliInputError(`Project root does not exist: ${root}`, {
      cause: error,
    });
  }
}

async function writeReport(
  reportPath: string,
  result: ScanResult,
): Promise<string> {
  const absolutePath = path.resolve(reportPath);
  const extension = path.extname(absolutePath).toLowerCase();
  let contents: string;

  if (extension === ".html") {
    contents = renderHtmlReport(result);
  } else if (extension === ".json") {
    contents = renderJsonReport(result);
  } else {
    throw new CliInputError(
      `Report path must end in .html or .json: ${absolutePath}`,
    );
  }

  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, contents, "utf8");
  return absolutePath;
}

export async function runScanCommand(
  rootInput: string,
  options: ScanCommandOptions,
): Promise<ScanCommandResult> {
  const root = path.resolve(rootInput);
  await validateRoot(root);

  const manifestPath = path.isAbsolute(options.manifest)
    ? options.manifest
    : path.resolve(root, options.manifest);
  const result = await scanProject({
    root,
    manifestPath,
    ...(options.checkUrls === true ? { checkUrls: true } : {}),
  });
  const reportPath =
    options.report === undefined
      ? undefined
      : await writeReport(options.report, result);
  const output =
    options.format === "json"
      ? renderJsonReport(result)
      : formatPrettyReport(result, manifestPath);

  return {
    exitCode: result.summary.blockers > 0 ? 1 : 0,
    output,
    ...(reportPath === undefined ? {} : { reportPath }),
  };
}
