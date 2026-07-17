import { describe, expect, it } from "vitest";

import { renderHtmlReport, renderJsonReport } from "../src/report.js";
import type { ScanResult } from "../src/types.js";

const result: ScanResult = {
  product: "ScopeParity",
  rulesetVersion: "test",
  rulesetReviewedAt: "2026-07-18",
  reportId: "SP-TEST",
  manifestDigestSha256: "0".repeat(64),
  generatedAt: "2026-07-18T00:00:00.000Z",
  manifestPath: "oauth-evidence.yaml",
  scannedFiles: 1,
  stoppedAtRestrictedScopeBoundary: false,
  summary: { blockers: 1, manual: 0, complete: 0 },
  scopes: [],
  findings: [
    {
      ruleId: "TEST_RULE",
      severity: "blocker",
      blocking: true,
      category: "scope",
      title: "<script>alert(1)</script>",
      message: "No source line is included.",
      remediation: "Fix the synthetic mismatch.",
      evidence: ["src/<unsafe>.ts:4"],
      sourceUrl: "https://example.com/?a=1&b=2",
    },
  ],
  storyboard: [],
};

describe("reports", () => {
  it("escapes all inserted HTML and includes no remote assets", () => {
    const html = renderHtmlReport(result);
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toMatch(/<(?:script|link|img)[^>]+(?:src|href)=["']https?:/iu);
  });

  it("renders newline-terminated JSON", () => {
    const json = renderJsonReport(result);
    expect(json.endsWith("\n")).toBe(true);
    expect(JSON.parse(json).reportId).toBe("SP-TEST");
  });
});
