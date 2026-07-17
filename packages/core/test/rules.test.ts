import { describe, expect, it } from "vitest";

import { classifyScope, GOOGLE_SCOPE_CATALOG_URL } from "../src/catalog.js";
import { evaluateProject } from "../src/rules.js";
import type { ScopeInventoryItem } from "../src/types.js";
import { calendarScope, manifest } from "./helpers.js";

function scopeItem(scope: string): ScopeInventoryItem {
  return {
    scope,
    classification: classifyScope(scope),
    locations: [{ path: "src/auth.ts", line: 42 }],
    sourceUrl: GOOGLE_SCOPE_CATALOG_URL,
  };
}

describe("evaluateProject", () => {
  it("returns complete evidence for an aligned technical story", () => {
    const result = evaluateProject({ manifest: manifest(), scopes: [scopeItem(calendarScope)] });
    expect(result.findings.some((finding) => finding.ruleId === "SCOPE_SET_IN_PARITY")).toBe(true);
    expect(result.findings.some((finding) => finding.ruleId === "SCOPE_EVIDENCE_TRACE_COMPLETE")).toBe(
      true,
    );
    expect(result.findings.filter((finding) => finding.blocking)).toHaveLength(0);
  });

  it("finds scope, redirect, feature, and video drift", () => {
    const declaredOnly = "https://www.googleapis.com/auth/gmail.send";
    const value = manifest({
      oauth: {
        authorizedDomains: ["example.com"],
        redirectUris: ["https://callback.invalid.test/oauth"],
        declaredScopes: [declaredOnly],
      },
      features: [],
      evidence: { domainOwnershipVerified: false, video: { completed: false, steps: [] } },
    });
    const result = evaluateProject({ manifest: value, scopes: [scopeItem(calendarScope)] });
    expect(result.findings.map((finding) => finding.ruleId)).toEqual(
      expect.arrayContaining([
        "SCOPE_IN_CODE_NOT_DECLARED",
        "DECLARED_SCOPE_NOT_FOUND_IN_CODE",
        "REDIRECT_HOST_NOT_AUTHORIZED",
        "SCOPE_WITHOUT_FEATURE_EVIDENCE",
        "VIDEO_STEP_MISSING_FOR_SCOPE",
      ]),
    );
  });

  it("stops at the restricted-scope boundary", () => {
    const restricted = "https://www.googleapis.com/auth/gmail.readonly";
    const value = manifest({
      oauth: {
        authorizedDomains: ["example.com"],
        redirectUris: ["https://app.example.com/oauth"],
        declaredScopes: [restricted],
      },
    });
    const result = evaluateProject({ manifest: value, scopes: [] });
    expect(result.stoppedAtRestrictedScopeBoundary).toBe(true);
    expect(result.findings.map((finding) => finding.ruleId)).toContain(
      "RESTRICTED_SCOPE_REQUIRES_EXTERNAL_ASSESSMENT",
    );
    expect(result.findings.map((finding) => finding.ruleId)).not.toContain(
      "DECLARED_SCOPE_NOT_FOUND_IN_CODE",
    );
  });

  it("checks bounded public HTML only when evidence is supplied", () => {
    const value = manifest({ checks: { publicUrls: true } });
    const missing = evaluateProject({
      manifest: value,
      scopes: [scopeItem(calendarScope)],
      publicSurface: { homepageHtml: "<h1>Different product</h1>" },
    });
    expect(missing.findings.map((finding) => finding.ruleId)).toEqual(
      expect.arrayContaining(["PRIVACY_LINK_NOT_FOUND_ON_HOMEPAGE", "APP_NAME_NOT_FOUND_ON_HOMEPAGE"]),
    );
    expect(
      missing.findings
        .filter((finding) =>
          ["PRIVACY_LINK_NOT_FOUND_ON_HOMEPAGE", "APP_NAME_NOT_FOUND_ON_HOMEPAGE"].includes(
            finding.ruleId,
          ),
        )
        .every((finding) => finding.severity === "manual" && !finding.blocking),
    ).toBe(true);
  });

  it("flags an objective homepage redirect and a reused privacy URL", () => {
    const value = manifest({
      app: {
        name: "Northstar Notes",
        supportEmailDomain: "example.com",
        homepageUrl: "https://www.example.com/product",
        privacyPolicyUrl: "https://www.example.com/product",
      },
      checks: { publicUrls: true },
    });
    const result = evaluateProject({
      manifest: value,
      scopes: [scopeItem(calendarScope)],
      publicSurface: {
        homepageHtml: '<h1>Northstar Notes</h1><a href="/product">Privacy</a>',
        homepageFinalUrl: "https://app.example.com/product",
      },
    });

    expect(result.findings.map((finding) => finding.ruleId)).toEqual(
      expect.arrayContaining(["PRIVACY_URL_EQUALS_HOMEPAGE", "HOMEPAGE_REDIRECT_CHANGED_URL"]),
    );
    expect(
      result.findings
        .filter((finding) =>
          ["PRIVACY_URL_EQUALS_HOMEPAGE", "HOMEPAGE_REDIRECT_CHANGED_URL"].includes(finding.ruleId),
        )
        .every((finding) => finding.blocking),
    ).toBe(true);
  });

  it("reports an explicit public-check failure without pretending the check ran", () => {
    const value = manifest({ checks: { publicUrls: true } });
    const result = evaluateProject({
      manifest: value,
      scopes: [scopeItem(calendarScope)],
      publicSurface: { error: "Public URL DNS response included a non-public address" },
    });
    expect(result.findings.map((finding) => finding.ruleId)).toContain("PUBLIC_URL_CHECK_FAILED");
    expect(result.findings.map((finding) => finding.ruleId)).not.toContain("PUBLIC_URL_CHECK_NOT_RUN");
  });
});
