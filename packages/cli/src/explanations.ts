export interface RuleExplanation {
  readonly code: string;
  readonly group: "must fix" | "confirm manually" | "evidence complete";
  readonly summary: string;
  readonly nextAction: string;
  readonly sourceUrl: string;
}

const VERIFICATION_REQUIREMENTS =
  "https://support.google.com/cloud/answer/13464321?hl=en";
const VIDEO_GUIDANCE = "https://support.google.com/cloud/answer/13804565?hl=en";
const RESTRICTED_SCOPE_GUIDANCE =
  "https://support.google.com/cloud/answer/13464325?hl=en";
const DATA_ACCESS_GUIDANCE =
  "https://support.google.com/cloud/answer/15549135?hl=en";
const APP_HOMEPAGE_GUIDANCE =
  "https://support.google.com/cloud/answer/13807376?hl=en";
const APP_PRIVACY_GUIDANCE =
  "https://support.google.com/cloud/answer/13806988?hl=en";
const SCOPE_CATALOG =
  "https://developers.google.com/identity/protocols/oauth2/scopes";

const explanations: readonly RuleExplanation[] = [
  {
    code: "SCOPE_IN_CODE_NOT_DECLARED",
    group: "must fix",
    summary: "A tracked source file requests a Google OAuth scope that is absent from the declared consent-screen scopes.",
    nextAction: "Remove the request or add the exact scope to the consent-screen configuration and manifest.",
    sourceUrl: VERIFICATION_REQUIREMENTS,
  },
  {
    code: "DECLARED_SCOPE_NOT_FOUND_IN_CODE",
    group: "must fix",
    summary: "The manifest declares a scope that ScopeParity could not find in an allowed tracked source file.",
    nextAction: "Remove the unused declaration or point its feature evidence at the tracked code that requests it.",
    sourceUrl: VERIFICATION_REQUIREMENTS,
  },
  {
    code: "RESTRICTED_SCOPE_REQUIRES_EXTERNAL_ASSESSMENT",
    group: "must fix",
    summary: "A restricted scope crossed ScopeParity's supported boundary. ScopeParity does not assess restricted scopes or CASA requirements.",
    nextAction: "Stop this preflight and follow Google's restricted-scope verification and security-assessment process.",
    sourceUrl: RESTRICTED_SCOPE_GUIDANCE,
  },
  {
    code: "REDIRECT_HOST_NOT_AUTHORIZED",
    group: "must fix",
    summary: "A redirect URI host is not covered by the manifest's authorized domains.",
    nextAction: "Make the redirect host and authorized-domain configuration agree, then run the scan again.",
    sourceUrl: VERIFICATION_REQUIREMENTS,
  },
  {
    code: "HOMEPAGE_DOMAIN_NOT_DECLARED",
    group: "must fix",
    summary: "The public homepage host is not covered by the declared authorized domains.",
    nextAction: "Use a verified authorized domain for the homepage or correct the manifest value.",
    sourceUrl: VERIFICATION_REQUIREMENTS,
  },
  {
    code: "PRIVACY_DOMAIN_MISMATCH",
    group: "must fix",
    summary: "The privacy-policy URL is not hosted on, or clearly associated with, the app's declared public domain.",
    nextAction: "Align the privacy-policy URL with the verified public identity submitted to Google.",
    sourceUrl: VERIFICATION_REQUIREMENTS,
  },
  {
    code: "PRIVACY_URL_EQUALS_HOMEPAGE",
    group: "must fix",
    summary: "The manifest uses the same URL for the app homepage and privacy policy.",
    nextAction: "Publish a dedicated privacy-policy page and record its distinct public URL in the launch manifest.",
    sourceUrl: APP_PRIVACY_GUIDANCE,
  },
  {
    code: "HOMEPAGE_REDIRECT_CHANGED_URL",
    group: "must fix",
    summary: "The bounded public check reached a final URL different from the homepage recorded in the manifest.",
    nextAction: "Use a stable public homepage URL that does not redirect, then align the launch manifest and consent-screen value.",
    sourceUrl: APP_HOMEPAGE_GUIDANCE,
  },
  {
    code: "PRIVACY_LINK_NOT_FOUND_ON_HOMEPAGE",
    group: "confirm manually",
    summary: "The bounded public check did not find the declared privacy-policy URL in the fetched, non-rendered homepage HTML.",
    nextAction: "Inspect the rendered signed-out page first; add the exact privacy link to initial HTML only if it is truly absent.",
    sourceUrl: APP_HOMEPAGE_GUIDANCE,
  },
  {
    code: "APP_NAME_NOT_FOUND_ON_HOMEPAGE",
    group: "confirm manually",
    summary: "The bounded public check did not find the manifest app name in the fetched, non-rendered homepage HTML.",
    nextAction: "Inspect the rendered signed-out page first; align the visible identity or manifest only if they actually differ.",
    sourceUrl: APP_HOMEPAGE_GUIDANCE,
  },
  {
    code: "SCOPE_WITHOUT_FEATURE_EVIDENCE",
    group: "must fix",
    summary: "A declared scope has no feature and local route explaining why the app requests it.",
    nextAction: "Map the scope to one concrete user-facing feature and the local route used for recording evidence.",
    sourceUrl: VERIFICATION_REQUIREMENTS,
  },
  {
    code: "VIDEO_STEP_MISSING_FOR_SCOPE",
    group: "must fix",
    summary: "A declared scope is not demonstrated by a planned video step.",
    nextAction: "Add a shot that shows consent and the feature's end-to-end use of this scope.",
    sourceUrl: VIDEO_GUIDANCE,
  },
  {
    code: "FILE_SKIPPED_BY_SAFETY_BOUNDARY",
    group: "confirm manually",
    summary: "A tracked file was excluded because it was unsafe or outside ScopeParity's bounded source allowlist.",
    nextAction: "Confirm manually whether the skipped file contains OAuth scope configuration; never weaken the boundary to scan secrets.",
    sourceUrl: "https://github.com/sora-volare0319/scopeparity/blob/main/SECURITY.md",
  },
  {
    code: "SCOPE_CLASSIFICATION_CONFIRM_MANUALLY",
    group: "confirm manually",
    summary: "A scope is absent from the bundled classification catalog, so ScopeParity did not infer its current category.",
    nextAction: "Confirm the scope and its classification in Google's current scope catalog and Cloud Console.",
    sourceUrl: SCOPE_CATALOG,
  },
  {
    code: "DOMAIN_OWNERSHIP_CONFIRM_MANUALLY",
    group: "confirm manually",
    summary: "Domain ownership is not marked as confirmed, and ScopeParity will not request Search Console credentials to inspect it.",
    nextAction: "Confirm ownership with the Google account and role used for the intended submission.",
    sourceUrl: VERIFICATION_REQUIREMENTS,
  },
  {
    code: "PUBLIC_URL_CHECK_FAILED",
    group: "confirm manually",
    summary: "The bounded public check could not collect valid homepage evidence, so ScopeParity did not infer the page state.",
    nextAction: "Review the recorded network failure, confirm the exact public URL manually, and retry only after the cause is understood.",
    sourceUrl: APP_HOMEPAGE_GUIDANCE,
  },
  {
    code: "PUBLIC_URL_CHECK_NOT_RUN",
    group: "confirm manually",
    summary: "Public URL checks were requested, but no bounded homepage evidence was supplied to the local scan.",
    nextAction: "Run the explicit HTTPS-only public check when available or inspect the public surfaces manually while logged out.",
    sourceUrl: VERIFICATION_REQUIREMENTS,
  },
  {
    code: "SCOPE_SET_IN_PARITY",
    group: "evidence complete",
    summary: "Every literal scope found in supported tracked source matches the manifest scope set.",
    nextAction: "Keep the scan in CI so later scope changes remain reviewable.",
    sourceUrl: VERIFICATION_REQUIREMENTS,
  },
  {
    code: "DOMAIN_SET_IN_PARITY",
    group: "evidence complete",
    summary: "Homepage, privacy-policy, and redirect hosts match the declared authorized-domain model.",
    nextAction: "Keep the values aligned and separately confirm domain ownership before submission.",
    sourceUrl: VERIFICATION_REQUIREMENTS,
  },
  {
    code: "SCOPE_EVIDENCE_TRACE_COMPLETE",
    group: "evidence complete",
    summary: "Every declared scope maps to a named feature and a demonstration storyboard step.",
    nextAction: "Record the live product using the storyboard, then inspect the final video manually.",
    sourceUrl: DATA_ACCESS_GUIDANCE,
  },
];

export const RULE_EXPLANATIONS = new Map(
  explanations.map((explanation) => [explanation.code, explanation]),
);

export function listRuleCodes(): string[] {
  return [...RULE_EXPLANATIONS.keys()].sort();
}
