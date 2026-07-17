import { constants } from "node:fs";
import { access, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import { CliInputError } from "./errors.js";

export const DEFAULT_MANIFEST_NAME = "oauth-evidence.yaml";

export const MANIFEST_TEMPLATE = `# ScopeParity reads only secret-free launch evidence.
# Never add client IDs, client secrets, tokens, service-account data, or credentials.
schemaVersion: 1

app:
  name: "Your app name"
  supportEmailDomain: "example.com"
  homepageUrl: "https://example.com"
  privacyPolicyUrl: "https://example.com/privacy"

oauth:
  authorizedDomains:
    - "example.com"
  redirectUris:
    - "https://app.example.com/auth/google/callback"
  declaredScopes:
    - "openid"
    - "https://www.googleapis.com/auth/userinfo.email"

# Give every non-identity scope one user-facing reason and a route you can record.
features:
  - name: "Sign in with Google"
    route: "/sign-in"
    scopes:
      - "openid"
      - "https://www.googleapis.com/auth/userinfo.email"

evidence:
  domainOwnershipVerified: false
  video:
    completed: false
    steps:
      - title: "Show the consent screen and requested scopes"
        route: "/sign-in"
        scopes:
          - "openid"
          - "https://www.googleapis.com/auth/userinfo.email"

# Public URL checks are opt-in. They never send repository content or credentials.
checks:
  publicUrls: false
`;

export async function initializeManifest(rootInput: string): Promise<string> {
  const root = path.resolve(rootInput);

  let rootStat;
  try {
    rootStat = await stat(root);
  } catch (error) {
    throw new CliInputError(`Project root does not exist: ${root}`, { cause: error });
  }

  if (!rootStat.isDirectory()) {
    throw new CliInputError(`Project root is not a directory: ${root}`);
  }

  const target = path.join(root, DEFAULT_MANIFEST_NAME);
  try {
    await access(target, constants.F_OK);
    throw new CliInputError(
      `Refusing to overwrite existing manifest: ${target}`,
    );
  } catch (error) {
    if (error instanceof CliInputError) {
      throw error;
    }
  }

  await writeFile(target, MANIFEST_TEMPLATE, { encoding: "utf8", flag: "wx" });
  return target;
}
