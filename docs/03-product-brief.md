# Product brief — local OAuth launch evidence

Last reviewed: 2026-07-18

## Job to be done

When I am about to submit or change a public Google OAuth app, help me prove that the code, consent-screen values, public identity surfaces, and demonstration plan tell the same technical story, so I can remove avoidable inconsistencies before review without giving a new vendor my code or Google credentials.

## Product promise

“See the technical story Google will compare, before you submit it.”

The product reports evidence and mismatches. It never reports an approval probability or a compliance score.

## Core workflow

1. Run the CLI inside a Git repository.
2. If no manifest exists, initialize a secret-free `oauth-evidence.yaml` template and fill its documented values locally.
3. Scan tracked, allowed source files for literal Google OAuth scope values.
4. Compare code scopes, declared scopes, redirect hosts, authorized domains, and public URLs.
5. Stop at the restricted-scope boundary with an official next-step reference.
6. Show a compact terminal result grouped as `must fix`, `confirm manually`, and `evidence complete`.
7. Generate a self-contained free diagnostic report and starter storyboard.
8. In the paid workspace, compile the diagnostic into a scope matrix, recording runbook, interactive local workspace, provenance record, and optional read-only CI workflow.

## Inputs

Only secret-free values are accepted:

- app name and support email domain;
- homepage and privacy-policy URLs;
- authorized domains and redirect URIs;
- scopes copied from the consent-screen configuration;
- feature name and local route for each scope;
- evidence status for domain ownership and the demo video.

The tool never asks for client IDs, client secrets, access tokens, refresh tokens, service-account data, or Google Cloud access.

## Deterministic findings

Initial blocking rules:

- `SCOPE_IN_CODE_NOT_DECLARED`
- `DECLARED_SCOPE_NOT_FOUND_IN_CODE`
- `RESTRICTED_SCOPE_REQUIRES_EXTERNAL_ASSESSMENT`
- `REDIRECT_HOST_NOT_AUTHORIZED`
- `HOMEPAGE_DOMAIN_NOT_DECLARED`
- `PRIVACY_DOMAIN_MISMATCH`
- `PRIVACY_LINK_NOT_FOUND_ON_HOMEPAGE`
- `APP_NAME_NOT_FOUND_ON_HOMEPAGE`
- `SCOPE_WITHOUT_FEATURE_EVIDENCE`
- `VIDEO_STEP_MISSING_FOR_SCOPE`

Heuristic observations such as a login-only homepage are never blockers and must be labelled `confirm manually`.

## Safety contract

- Default file discovery is `git ls-files`, not a recursive disk walk.
- Scan only an explicit source-extension allowlist.
- Always exclude `.env*`, credentials, secrets, keys, certificates, `.npmrc`, lockfile auth, binaries, submodules, and symlinks.
- Never print source lines; output only normalized scope, relative file path, and line number.
- Public URL checks are opt-in, HTTPS-only, and reject loopback, private, link-local, metadata, and private-DNS destinations on every redirect.
- No telemetry, crash reporting, remote fonts, CDN assets, analytics, or model calls in the CLI/report.
- CI needs `contents: read` only and must not use `pull_request_target`.

## Experience principles

- **Evidence before status:** show exactly which two surfaces disagree.
- **No false certainty:** reserve red for objective inconsistencies; manual judgment is amber.
- **Local is visible:** every screen explains what stayed on the device.
- **Fast first value:** show every deterministic finding without licensing; charge for repeatable evidence production after diagnosis.
- **Calm launch room:** dense enough for developers, legible enough to share with a founder.
- **One next action:** every finding has one remediation step and one official source.

## Success metrics

- time to first finding;
- scan completion rate;
- number of objective blockers found per qualified repository;
- critical-miss and false-positive rates on fixtures;
- free-to-paid conversion;
- paid workspace generation success;
- refund rate;
- settled gross revenue attributable to the product.
