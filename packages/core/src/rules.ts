import { GOOGLE_RESTRICTED_SCOPE_URL, isRestrictedScope, normalizeScope } from "./catalog.js";
import type {
  EvaluationInput,
  Finding,
  FindingCategory,
  FindingSeverity,
  StoryboardStep,
} from "./types.js";

const UNVERIFIED_APPS_URL = "https://support.google.com/cloud/answer/7454865?hl=en";
const VERIFICATION_REQUIREMENTS_URL =
  "https://support.google.com/cloud/answer/13464321?hl=en";
const DATA_ACCESS_URL = "https://support.google.com/cloud/answer/15549135?hl=en";
const APP_HOMEPAGE_URL = "https://support.google.com/cloud/answer/13807376?hl=en";
const APP_PRIVACY_URL = "https://support.google.com/cloud/answer/13806988?hl=en";

type EvaluationOutput = {
  findings: Finding[];
  stoppedAtRestrictedScopeBoundary: boolean;
  storyboard: StoryboardStep[];
};

function finding(input: {
  ruleId: string;
  severity: FindingSeverity;
  category: FindingCategory;
  title: string;
  message: string;
  remediation: string;
  evidence?: string[];
  sourceUrl: string;
}): Finding {
  return {
    ...input,
    blocking: input.severity === "blocker",
    evidence: input.evidence ?? [],
  };
}

function coversHost(domainInput: string, hostInput: string): boolean {
  const domain = domainInput.toLowerCase().replace(/^\.+|\.+$/gu, "");
  const host = hostInput.toLowerCase().replace(/^\.+|\.+$/gu, "");
  return host === domain || host.endsWith(`.${domain}`);
}

function hostFor(url: string): string {
  return new URL(url).hostname.toLowerCase();
}

function canonicalUrl(url: string): string {
  const parsed = new URL(url);
  parsed.hash = "";
  return parsed.toString();
}

function locationEvidence(scope: string, paths: Array<{ path: string; line: number }>): string[] {
  return paths.map((location) => `${scope} · ${location.path}:${location.line}`);
}

function sortedUnique(values: Iterable<string>): string[] {
  return [...new Set([...values].map(normalizeScope))].sort();
}

export function evaluateProject(input: EvaluationInput): EvaluationOutput {
  const findings: Finding[] = [...(input.safetyFindings ?? [])];
  const declaredScopes = sortedUnique(input.manifest.oauth.declaredScopes);
  const sourceScopes = sortedUnique(input.scopes.map((item) => item.scope));
  const scopeByName = new Map(input.scopes.map((item) => [item.scope, item]));
  const restrictedScopes = sortedUnique(
    [...declaredScopes, ...sourceScopes].filter((scope) => isRestrictedScope(scope)),
  );
  const storyboard = input.manifest.evidence.video.steps.map((step, index) => ({
    index: index + 1,
    title: step.title,
    route: step.route,
    scopes: sortedUnique(step.scopes),
  }));

  if (restrictedScopes.length > 0) {
    findings.push(
      finding({
        ruleId: "RESTRICTED_SCOPE_REQUIRES_EXTERNAL_ASSESSMENT",
        severity: "blocker",
        category: "boundary",
        title: "Restricted scope detected; ScopeParity stopped at its assessment boundary.",
        message:
          "Restricted scopes can require additional review and an independent security assessment. ScopeParity does not evaluate that work.",
        remediation:
          "Review Google's current restricted-scope guidance and work with an eligible assessor when required.",
        evidence: restrictedScopes,
        sourceUrl: GOOGLE_RESTRICTED_SCOPE_URL,
      }),
    );
    return { findings, stoppedAtRestrictedScopeBoundary: true, storyboard };
  }

  const undeclared = sourceScopes.filter((scope) => !declaredScopes.includes(scope));
  for (const scope of undeclared) {
    const item = scopeByName.get(scope);
    findings.push(
      finding({
        ruleId: "SCOPE_IN_CODE_NOT_DECLARED",
        severity: "blocker",
        category: "scope",
        title: "A scope requested in source is absent from the submission manifest.",
        message: `${scope} appears in tracked source but is not declared in oauth.declaredScopes.`,
        remediation:
          "Confirm which scope the shipped feature needs, then make the runtime request and intended consent-screen declaration match.",
        evidence: locationEvidence(scope, item?.locations ?? []),
        sourceUrl: UNVERIFIED_APPS_URL,
      }),
    );
  }

  const notFoundInSource = declaredScopes.filter((scope) => !sourceScopes.includes(scope));
  for (const scope of notFoundInSource) {
    findings.push(
      finding({
        ruleId: "DECLARED_SCOPE_NOT_FOUND_IN_CODE",
        severity: "blocker",
        category: "scope",
        title: "A declared scope was not found in tracked source.",
        message: `${scope} is declared in the manifest but was not found as a literal in supported tracked files.`,
        remediation:
          "Remove an unused declaration or confirm that a supported runtime builds this scope dynamically and document that exception.",
        evidence: [scope],
        sourceUrl: VERIFICATION_REQUIREMENTS_URL,
      }),
    );
  }

  if (undeclared.length === 0 && notFoundInSource.length === 0) {
    findings.push(
      finding({
        ruleId: "SCOPE_SET_IN_PARITY",
        severity: "complete",
        category: "scope",
        title: "Source and manifest scope sets are in parity.",
        message: "Every normalized literal scope found in source is declared, and every declaration was found.",
        remediation: "Keep this comparison in CI so later scope changes produce a reviewable diff.",
        evidence: declaredScopes,
        sourceUrl: UNVERIFIED_APPS_URL,
      }),
    );
  }

  const unknownScopes = input.scopes
    .filter((item) => item.classification === "unknown")
    .map((item) => item.scope);
  if (unknownScopes.length > 0) {
    findings.push(
      finding({
        ruleId: "SCOPE_CLASSIFICATION_CONFIRM_MANUALLY",
        severity: "manual",
        category: "scope",
        title: "One or more scope classifications are not in the bundled catalog.",
        message: "ScopeParity will not infer a sensitivity category for an unknown scope.",
        remediation: "Confirm the current classification in Google Cloud and the official scope documentation.",
        evidence: sortedUnique(unknownScopes),
        sourceUrl: "https://developers.google.com/identity/protocols/oauth2/scopes",
      }),
    );
  }

  const authorizedDomains = input.manifest.oauth.authorizedDomains;
  for (const redirectUri of input.manifest.oauth.redirectUris) {
    const host = hostFor(redirectUri);
    if (!authorizedDomains.some((domain) => coversHost(domain, host))) {
      findings.push(
        finding({
          ruleId: "REDIRECT_HOST_NOT_AUTHORIZED",
          severity: "blocker",
          category: "domain",
          title: "A redirect host is not covered by a declared authorized domain.",
          message: `${host} is used by a redirect URI but is not covered by oauth.authorizedDomains.`,
          remediation: "Remove the redirect from the launch set or reconcile the intended authorized domain.",
          evidence: [redirectUri, `authorized: ${authorizedDomains.join(", ")}`],
          sourceUrl: VERIFICATION_REQUIREMENTS_URL,
        }),
      );
    }
  }

  const homepageHost = hostFor(input.manifest.app.homepageUrl);
  if (!authorizedDomains.some((domain) => coversHost(domain, homepageHost))) {
    findings.push(
      finding({
        ruleId: "HOMEPAGE_DOMAIN_NOT_DECLARED",
        severity: "blocker",
        category: "domain",
        title: "The homepage host is not covered by an authorized domain.",
        message: `${homepageHost} is not covered by oauth.authorizedDomains.`,
        remediation: "Reconcile the homepage and authorized-domain values intended for submission.",
        evidence: [input.manifest.app.homepageUrl, `authorized: ${authorizedDomains.join(", ")}`],
        sourceUrl: VERIFICATION_REQUIREMENTS_URL,
      }),
    );
  }

  const privacyHost = hostFor(input.manifest.app.privacyPolicyUrl);
  if (canonicalUrl(input.manifest.app.homepageUrl) === canonicalUrl(input.manifest.app.privacyPolicyUrl)) {
    findings.push(
      finding({
        ruleId: "PRIVACY_URL_EQUALS_HOMEPAGE",
        severity: "blocker",
        category: "public-surface",
        title: "The privacy-policy URL is the same as the homepage URL.",
        message: "Google requires a dedicated privacy-policy URL that differs from the submitted homepage URL.",
        remediation: "Publish a dedicated privacy page and record that exact URL in the launch manifest.",
        evidence: [input.manifest.app.homepageUrl],
        sourceUrl: APP_PRIVACY_URL,
      }),
    );
  }
  const sharedAuthorizedDomain = authorizedDomains.some(
    (domain) => coversHost(domain, homepageHost) && coversHost(domain, privacyHost),
  );
  if (!sharedAuthorizedDomain) {
    findings.push(
      finding({
        ruleId: "PRIVACY_DOMAIN_MISMATCH",
        severity: "blocker",
        category: "domain",
        title: "Homepage and privacy-policy hosts do not share a declared authorized domain.",
        message: `${homepageHost} and ${privacyHost} do not resolve to the same declared domain boundary.`,
        remediation: "Host and declare the two public surfaces under the domain model intended for review.",
        evidence: [input.manifest.app.homepageUrl, input.manifest.app.privacyPolicyUrl],
        sourceUrl: VERIFICATION_REQUIREMENTS_URL,
      }),
    );
  }

  if (
    findings.every(
      (item) =>
        item.category !== "domain" || item.severity !== "blocker",
    )
  ) {
    findings.push(
      finding({
        ruleId: "DOMAIN_SET_IN_PARITY",
        severity: "complete",
        category: "domain",
        title: "Declared public and redirect hosts share the authorized-domain contract.",
        message: "No objective host mismatch was found in the secret-free manifest.",
        remediation: "Confirm domain ownership in Google Search Console before submission.",
        evidence: authorizedDomains,
        sourceUrl: VERIFICATION_REQUIREMENTS_URL,
      }),
    );
  }

  if (!input.manifest.evidence.domainOwnershipVerified) {
    findings.push(
      finding({
        ruleId: "DOMAIN_OWNERSHIP_CONFIRM_MANUALLY",
        severity: "manual",
        category: "domain",
        title: "Domain ownership is not marked as confirmed.",
        message: "ScopeParity cannot inspect Google Search Console ownership without credentials.",
        remediation: "Confirm ownership using the same account and role required by Google's current guidance.",
        evidence: authorizedDomains,
        sourceUrl: VERIFICATION_REQUIREMENTS_URL,
      }),
    );
  }

  const featureScopes = new Set(input.manifest.features.flatMap((feature) => feature.scopes));
  const scopesWithoutFeature = declaredScopes.filter((scope) => !featureScopes.has(scope));
  for (const scope of scopesWithoutFeature) {
    findings.push(
      finding({
        ruleId: "SCOPE_WITHOUT_FEATURE_EVIDENCE",
        severity: "blocker",
        category: "evidence",
        title: "A declared scope has no mapped product feature.",
        message: `${scope} is not connected to a named, user-visible feature in the manifest.`,
        remediation: "Map the scope to the feature that requires it and the route where that use is observable.",
        evidence: [scope],
        sourceUrl: DATA_ACCESS_URL,
      }),
    );
  }

  const videoScopes = new Set(input.manifest.evidence.video.steps.flatMap((step) => step.scopes));
  const scopesWithoutVideo = declaredScopes.filter((scope) => !videoScopes.has(scope));
  for (const scope of scopesWithoutVideo) {
    findings.push(
      finding({
        ruleId: "VIDEO_STEP_MISSING_FOR_SCOPE",
        severity: "blocker",
        category: "evidence",
        title: "A declared scope is absent from the demonstration storyboard.",
        message: `${scope} has no recording step that demonstrates the corresponding feature.`,
        remediation: "Add a shot that begins at a reproducible route and visibly exercises the feature using this scope.",
        evidence: [scope],
        sourceUrl: DATA_ACCESS_URL,
      }),
    );
  }

  if (scopesWithoutFeature.length === 0 && scopesWithoutVideo.length === 0) {
    findings.push(
      finding({
        ruleId: "SCOPE_EVIDENCE_TRACE_COMPLETE",
        severity: "complete",
        category: "evidence",
        title: "Every declared scope maps to a feature and a recording step.",
        message: "The manifest contains a complete technical trace from scope to feature to storyboard.",
        remediation: "Record the live product as described and verify the final video manually.",
        evidence: declaredScopes,
        sourceUrl: DATA_ACCESS_URL,
      }),
    );
  }

  if (input.manifest.checks.publicUrls) {
    const homepageHtml = input.publicSurface?.homepageHtml;
    if (input.publicSurface?.error) {
      findings.push(
        finding({
          ruleId: "PUBLIC_URL_CHECK_FAILED",
          severity: "manual",
          category: "public-surface",
          title: "The opt-in public homepage check could not complete.",
          message: input.publicSurface.error,
          remediation: "Confirm the HTTPS URL and network path, then rerun or inspect the public surfaces manually.",
          evidence: [input.manifest.app.homepageUrl],
          sourceUrl: VERIFICATION_REQUIREMENTS_URL,
        }),
      );
    } else if (homepageHtml === undefined) {
      findings.push(
        finding({
          ruleId: "PUBLIC_URL_CHECK_NOT_RUN",
          severity: "manual",
          category: "public-surface",
          title: "Public URL checks were requested but no fetched homepage evidence was provided.",
          message: "The local source/config scan completed without making a network request.",
          remediation: "Run the explicit HTTPS-only public check, or confirm the public surfaces manually.",
          evidence: [input.manifest.app.homepageUrl],
          sourceUrl: VERIFICATION_REQUIREMENTS_URL,
        }),
      );
    } else {
      const intendedHomepage = canonicalUrl(input.manifest.app.homepageUrl);
      const fetchedHomepage = input.publicSurface?.homepageFinalUrl
        ? canonicalUrl(input.publicSurface.homepageFinalUrl)
        : intendedHomepage;
      if (fetchedHomepage !== intendedHomepage) {
        findings.push(
          finding({
            ruleId: "HOMEPAGE_REDIRECT_CHANGED_URL",
            severity: "blocker",
            category: "public-surface",
            title: "The submitted homepage redirects to a different URL.",
            message: "The bounded public check reached a final URL that differs from the homepage recorded in the manifest.",
            remediation: "Use a static homepage URL that does not redirect, then align the consent-screen value.",
            evidence: [intendedHomepage, fetchedHomepage],
            sourceUrl: APP_HOMEPAGE_URL,
          }),
        );
      }
      const normalizedHtml = homepageHtml.toLocaleLowerCase("en-US");
      const privacyUrl = input.manifest.app.privacyPolicyUrl;
      const privacyPath = new URL(privacyUrl).pathname;
      if (
        !normalizedHtml.includes(privacyUrl.toLocaleLowerCase("en-US")) &&
        !normalizedHtml.includes(privacyPath.toLocaleLowerCase("en-US"))
      ) {
        findings.push(
          finding({
            ruleId: "PRIVACY_LINK_NOT_FOUND_ON_HOMEPAGE",
            severity: "manual",
            category: "public-surface",
            title: "The declared privacy-policy link was not found in fetched homepage HTML.",
            message: "Neither the absolute privacy URL nor its path appears in the bounded, non-rendered HTML evidence.",
            remediation: "Confirm the rendered page exposes the same privacy-policy link, or add it to the initial HTML.",
            evidence: [input.manifest.app.homepageUrl, privacyUrl],
            sourceUrl: APP_HOMEPAGE_URL,
          }),
        );
      }
      if (!normalizedHtml.includes(input.manifest.app.name.toLocaleLowerCase("en-US"))) {
        findings.push(
          finding({
            ruleId: "APP_NAME_NOT_FOUND_ON_HOMEPAGE",
            severity: "manual",
            category: "public-surface",
            title: "The declared app name was not found in fetched homepage HTML.",
            message: "The exact app name does not appear in the bounded, non-rendered homepage HTML evidence.",
            remediation: "Confirm the rendered page identifies the app using the submitted name, or add it to the initial HTML.",
            evidence: [input.manifest.app.name, input.manifest.app.homepageUrl],
            sourceUrl: APP_HOMEPAGE_URL,
          }),
        );
      }
    }
  }

  return { findings, stoppedAtRestrictedScopeBoundary: false, storyboard };
}
