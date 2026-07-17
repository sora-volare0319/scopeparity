import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ScanResult } from "@scopeparity/core";

const core = vi.hoisted(() => ({
  renderHtmlReport: vi.fn(),
  renderJsonReport: vi.fn(),
  scanProject: vi.fn(),
}));

vi.mock("@scopeparity/core", () => core);

import { formatPrettyReport, runScanCommand } from "../src/scan.js";

const temporaryDirectories: string[] = [];

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), "scopeparity-scan-"));
  temporaryDirectories.push(directory);
  return directory;
}

const blockedResult = {
  product: "ScopeParity",
  rulesetVersion: "2026.07.18",
  rulesetReviewedAt: "2026-07-18",
  reportId: "SP-TEST",
  manifestDigestSha256: "0".repeat(64),
  generatedAt: "2026-07-18T00:00:00.000Z",
  manifestPath: "oauth-evidence.yaml",
  scannedFiles: 4,
  stoppedAtRestrictedScopeBoundary: true,
  summary: { blockers: 2, manual: 1, complete: 1 },
  scopes: [],
  storyboard: [],
  findings: [
    {
      ruleId: "SCOPE_IN_CODE_NOT_DECLARED",
      severity: "blocker",
      blocking: true,
      category: "scope",
      title: "Code and consent-screen scopes differ",
      message: "Drive scope appears in tracked source but not in the manifest.",
      remediation: "Declare the exact scope or remove the request.",
      evidence: [
        "https://www.googleapis.com/auth/drive.file · src/auth.ts:12",
      ],
      sourceUrl: "https://support.google.com/cloud/answer/13464321?hl=en",
    },
    {
      ruleId: "RESTRICTED_SCOPE_REQUIRES_EXTERNAL_ASSESSMENT",
      severity: "blocker",
      blocking: true,
      category: "boundary",
      title: "Restricted scope detected",
      message: "ScopeParity stopped at its assessment boundary.",
      remediation: "Follow Google's external assessment process.",
      evidence: [],
      sourceUrl: "https://support.google.com/cloud/answer/13464325?hl=en",
    },
    {
      ruleId: "HOMEPAGE_REQUIRES_MANUAL_REVIEW",
      severity: "manual",
      blocking: false,
      category: "public-surface",
      title: "Open the homepage logged out",
      message: "A human must confirm the page.",
      remediation: "Open the page without a session.",
      evidence: [],
      sourceUrl: "https://support.google.com/cloud/answer/13464321?hl=en",
    },
    {
      ruleId: "AUTHORIZED_DOMAIN_ALIGNED",
      severity: "complete",
      blocking: false,
      category: "domain",
      title: "Authorized domains align",
      message: "No objective mismatch was found.",
      remediation: "Keep this value in parity.",
      evidence: [],
      sourceUrl: "https://support.google.com/cloud/answer/13464321?hl=en",
    },
  ],
} satisfies ScanResult;

beforeEach(() => {
  core.renderHtmlReport.mockReset();
  core.renderJsonReport.mockReset();
  core.scanProject.mockReset();
  core.scanProject.mockResolvedValue(blockedResult);
  core.renderJsonReport.mockImplementation((result: unknown) =>
    JSON.stringify(result, null, 2),
  );
  core.renderHtmlReport.mockReturnValue("<!doctype html><title>ScopeParity</title>");
});

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("runScanCommand", () => {
  it("shows all three evidence groups and exits 1 for objective blockers", async () => {
    const root = await temporaryDirectory();

    const result = await runScanCommand(root, {
      manifest: "oauth-evidence.yaml",
      format: "pretty",
    });

    expect(result.exitCode).toBe(1);
    expect(result.output).toContain("MUST FIX (2)");
    expect(result.output).toContain("CONFIRM MANUALLY (1)");
    expect(result.output).toContain("EVIDENCE COMPLETE (1)");
    expect(result.output).toContain("RESTRICTED-SCOPE BOUNDARY");
    expect(result.output).toContain("src/auth.ts:12");
    expect(core.scanProject).toHaveBeenCalledWith({
      root,
      manifestPath: path.join(root, "oauth-evidence.yaml"),
    });
  });

  it("allows an explicit opt-in public URL check", async () => {
    const root = await temporaryDirectory();

    await runScanCommand(root, {
      manifest: "oauth-evidence.yaml",
      format: "pretty",
      checkUrls: true,
    });

    expect(core.scanProject).toHaveBeenCalledWith({
      root,
      manifestPath: path.join(root, "oauth-evidence.yaml"),
      checkUrls: true,
    });
  });

  it("writes a self-contained HTML report", async () => {
    const root = await temporaryDirectory();
    const reportPath = path.join(root, "artifacts", "evidence.html");

    const result = await runScanCommand(root, {
      manifest: "oauth-evidence.yaml",
      format: "json",
      report: reportPath,
    });

    expect(result.reportPath).toBe(reportPath);
    expect(await readFile(reportPath, "utf8")).toContain("<!doctype html>");
    expect(result.output).toContain('"blockers": 2');
  });

  it("stops when core rejects a credential-bearing manifest", async () => {
    const root = await temporaryDirectory();
    core.scanProject.mockRejectedValue(
      new Error(
        'Manifest contains forbidden credential field "oauth.clientSecret". ScopeParity never needs credentials.',
      ),
    );

    await expect(
      runScanCommand(root, {
        manifest: "oauth-evidence.yaml",
        format: "pretty",
      }),
    ).rejects.toThrow("never needs credentials");
  });

  it("rejects ambiguous report extensions", async () => {
    const root = await temporaryDirectory();

    await expect(
      runScanCommand(root, {
        manifest: "oauth-evidence.yaml",
        format: "pretty",
        report: path.join(root, "report.txt"),
      }),
    ).rejects.toThrow("must end in .html or .json");
  });
});

describe("formatPrettyReport", () => {
  it("never implies approval when no blockers exist", () => {
    const report: ScanResult = {
      ...blockedResult,
      stoppedAtRestrictedScopeBoundary: false,
      summary: { blockers: 0, manual: 1, complete: 0 },
      findings: [
        {
          ruleId: "HOMEPAGE_REQUIRES_MANUAL_REVIEW",
          severity: "manual",
          blocking: false,
          category: "public-surface",
          title: "Confirm the public homepage manually",
          message: "A human must inspect the public page.",
          remediation: "Open the page logged out.",
          evidence: [],
          sourceUrl: "https://support.google.com/cloud/answer/13464321?hl=en",
        },
      ],
    };

    const output = formatPrettyReport(
      report,
      "/work/app/oauth-evidence.yaml",
    );

    expect(output).toContain("this is not an approval guarantee");
    expect(output).toContain(
      "https://github.com/sora-volare0319/scopeparity/issues/new?template=scan-feedback.yml",
    );
    expect(output).toContain("Nothing is sent automatically");
    expect(output).toContain("tied to your GitHub account");
    expect(output).not.toContain("approved");
    expect(output).not.toContain("/work/app");
  });
});
