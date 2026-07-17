import { writeFile } from "node:fs/promises";

import type { OAuthEvidenceManifest } from "../src/types.js";

export const calendarScope = "https://www.googleapis.com/auth/calendar.events";

export function manifest(
  overrides: Partial<OAuthEvidenceManifest> = {},
): OAuthEvidenceManifest {
  return {
    schemaVersion: 1,
    app: {
      name: "Northstar Notes",
      supportEmailDomain: "example.com",
      homepageUrl: "https://www.example.com",
      privacyPolicyUrl: "https://www.example.com/privacy",
    },
    oauth: {
      authorizedDomains: ["example.com"],
      redirectUris: ["https://app.example.com/auth/google/callback"],
      declaredScopes: [calendarScope],
    },
    features: [{ name: "Create an event", route: "/calendar", scopes: [calendarScope] }],
    evidence: {
      domainOwnershipVerified: true,
      video: {
        completed: false,
        steps: [{ title: "Create an event", route: "/calendar", scopes: [calendarScope] }],
      },
    },
    checks: { publicUrls: false },
    ...overrides,
  };
}

export async function writeManifest(path: string, value = manifest()): Promise<void> {
  const source = `schemaVersion: 1
app:
  name: "${value.app.name}"
  supportEmailDomain: "${value.app.supportEmailDomain}"
  homepageUrl: "${value.app.homepageUrl}"
  privacyPolicyUrl: "${value.app.privacyPolicyUrl}"
oauth:
  authorizedDomains:
${value.oauth.authorizedDomains.map((domain) => `    - "${domain}"`).join("\n")}
  redirectUris:
${value.oauth.redirectUris.map((url) => `    - "${url}"`).join("\n")}
  declaredScopes:
${value.oauth.declaredScopes.map((scope) => `    - "${scope}"`).join("\n")}
features:
${value.features
  .map(
    (feature) => `  - name: "${feature.name}"
    route: "${feature.route}"
    scopes:
${feature.scopes.map((scope) => `      - "${scope}"`).join("\n")}`,
  )
  .join("\n")}
evidence:
  domainOwnershipVerified: ${value.evidence.domainOwnershipVerified}
  video:
    completed: ${value.evidence.video.completed}
    steps:
${value.evidence.video.steps
  .map(
    (step) => `      - title: "${step.title}"
        route: "${step.route}"
        scopes:
${step.scopes.map((scope) => `          - "${scope}"`).join("\n")}`,
  )
  .join("\n")}
checks:
  publicUrls: ${value.checks.publicUrls}
`;
  await writeFile(path, source, "utf8");
}
