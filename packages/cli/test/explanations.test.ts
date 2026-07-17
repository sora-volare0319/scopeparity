import { describe, expect, it } from "vitest";

import { listRuleCodes, RULE_EXPLANATIONS } from "../src/explanations.js";

describe("rule explanations", () => {
  it("documents every initial deterministic rule", () => {
    expect(listRuleCodes()).toEqual(
      expect.arrayContaining([
        "SCOPE_IN_CODE_NOT_DECLARED",
        "DECLARED_SCOPE_NOT_FOUND_IN_CODE",
        "RESTRICTED_SCOPE_REQUIRES_EXTERNAL_ASSESSMENT",
        "REDIRECT_HOST_NOT_AUTHORIZED",
        "HOMEPAGE_DOMAIN_NOT_DECLARED",
        "PRIVACY_DOMAIN_MISMATCH",
        "PRIVACY_LINK_NOT_FOUND_ON_HOMEPAGE",
        "APP_NAME_NOT_FOUND_ON_HOMEPAGE",
        "SCOPE_WITHOUT_FEATURE_EVIDENCE",
        "VIDEO_STEP_MISSING_FOR_SCOPE",
      ]),
    );
  });

  it("makes the restricted-scope boundary explicit", () => {
    const explanation = RULE_EXPLANATIONS.get(
      "RESTRICTED_SCOPE_REQUIRES_EXTERNAL_ASSESSMENT",
    );

    expect(explanation?.summary).toContain("does not assess restricted scopes");
    expect(explanation?.nextAction).toContain("Stop this preflight");
  });
});
