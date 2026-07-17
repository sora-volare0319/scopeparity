import { describe, expect, it } from "vitest";

import { listRuleCodes, RULE_EXPLANATIONS } from "../src/explanations.js";

describe("rule explanations", () => {
  it("documents every emitted finding rule", () => {
    expect(listRuleCodes()).toEqual(
      [
        "APP_NAME_NOT_FOUND_ON_HOMEPAGE",
        "DECLARED_SCOPE_NOT_FOUND_IN_CODE",
        "DOMAIN_OWNERSHIP_CONFIRM_MANUALLY",
        "DOMAIN_SET_IN_PARITY",
        "FILE_SKIPPED_BY_SAFETY_BOUNDARY",
        "HOMEPAGE_DOMAIN_NOT_DECLARED",
        "HOMEPAGE_REDIRECT_CHANGED_URL",
        "PRIVACY_DOMAIN_MISMATCH",
        "PRIVACY_LINK_NOT_FOUND_ON_HOMEPAGE",
        "PRIVACY_URL_EQUALS_HOMEPAGE",
        "PUBLIC_URL_CHECK_FAILED",
        "PUBLIC_URL_CHECK_NOT_RUN",
        "REDIRECT_HOST_NOT_AUTHORIZED",
        "RESTRICTED_SCOPE_REQUIRES_EXTERNAL_ASSESSMENT",
        "SCOPE_CLASSIFICATION_CONFIRM_MANUALLY",
        "SCOPE_EVIDENCE_TRACE_COMPLETE",
        "SCOPE_IN_CODE_NOT_DECLARED",
        "SCOPE_SET_IN_PARITY",
        "SCOPE_WITHOUT_FEATURE_EVIDENCE",
        "VIDEO_STEP_MISSING_FOR_SCOPE",
      ].sort(),
    );
  });

  it("keeps raw-HTML absence findings in the manual-review group", () => {
    for (const code of [
      "PRIVACY_LINK_NOT_FOUND_ON_HOMEPAGE",
      "APP_NAME_NOT_FOUND_ON_HOMEPAGE",
    ]) {
      const explanation = RULE_EXPLANATIONS.get(code);
      expect(explanation?.group).toBe("confirm manually");
      expect(explanation?.nextAction).toContain("rendered signed-out page");
    }
  });

  it("makes the restricted-scope boundary explicit", () => {
    const explanation = RULE_EXPLANATIONS.get(
      "RESTRICTED_SCOPE_REQUIRES_EXTERNAL_ASSESSMENT",
    );

    expect(explanation?.summary).toContain("does not assess restricted scopes");
    expect(explanation?.nextAction).toContain("Stop this preflight");
  });
});
