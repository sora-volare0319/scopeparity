import { describe, expect, it } from "vitest";

import { parseManifest } from "../src/manifest.js";

const valid = `schemaVersion: 1
app:
  name: Northstar Notes
  supportEmailDomain: example.com
  homepageUrl: https://example.com
  privacyPolicyUrl: https://example.com/privacy
oauth:
  authorizedDomains: [example.com, example.com]
  redirectUris: [https://app.example.com/oauth/callback]
  declaredScopes: [https://www.googleapis.com/auth/calendar.events]
features:
  - name: Create an event
    route: /calendar
    scopes: [https://www.googleapis.com/auth/calendar.events]
evidence:
  domainOwnershipVerified: false
  video:
    completed: false
    steps:
      - title: Create an event
        route: /calendar
        scopes: [https://www.googleapis.com/auth/calendar.events]
checks:
  publicUrls: false
`;

describe("parseManifest", () => {
  it("parses, normalizes, and deduplicates a secret-free manifest", () => {
    const result = parseManifest(valid);
    expect(result.oauth.authorizedDomains).toEqual(["example.com"]);
    expect(result.oauth.declaredScopes).toEqual([
      "https://www.googleapis.com/auth/calendar.events",
    ]);
  });

  it("rejects credential-shaped fields even when nested", () => {
    expect(() => parseManifest(`${valid}\nclientSecret: do-not-accept\n`)).toThrow(
      /never needs credentials/u,
    );
  });

  it("rejects non-HTTPS public URLs", () => {
    expect(() => parseManifest(valid.replace("https://example.com\n", "http://example.com\n"))).toThrow(
      /must use HTTPS/u,
    );
  });

  it("disables YAML aliases", () => {
    expect(() => parseManifest(`root: &root [1]\ncopy: *root\n`)).toThrow();
  });
});
