---
title: "Google Workspace IDE scope lint vs. OAuth launch evidence parity"
description: "Use Google's IDE extension for code-time OAuth scope guidance, then compare source, submission intent, and demo evidence before verification."
intent: "google workspace developer tools oauth scope lint comparison"
slug: "google-workspace-ide-scope-lint-vs-scopeparity"
published: "2026-07-18"
updated: "2026-07-18"
---

# Use official lint first, then check launch parity

Google's Workspace IDE extension is the right first tool for OAuth scope linting, autocomplete, and inline documentation while you write code. ScopeParity does a different job after that: it compares Git-tracked scope literals with the secret-free values and per-scope recording evidence you intend to use for launch. Use both; neither predicts approval.

## What Google's official IDE extension does

Google documents its Workspace IDE extension as providing intelligent OAuth2 scope linting, autocomplete, and inline documentation in Visual Studio Code and compatible IDEs. That makes it the authoritative first stop for code-time guidance and scope discovery. Install and use it before adding another check.

Source: [Google Workspace Developer Tools](https://developers.google.com/workspace/guides/developer-tools), last updated 25 June 2026.

The official product page documents an IDE surface. It does not document a repository-wide comparison against your intended consent-screen list, public identity values, or demo-video storyboard. That is the narrower gap ScopeParity targets.

## Why code-time lint is not the whole submission

Google's verification flow asks for more than valid scope strings. For sensitive or restricted scopes, the submission includes a scope justification and a demo video showing the OAuth flow, product functionality, and how each scope is used. Google also tells developers to declare every requested scope and use the narrowest scopes needed.

Source: [Submitting your app for verification](https://support.google.com/cloud/answer/13461325?hl=en).

Apps Script adds a concrete cross-surface risk: the consent-screen dialog attempts to detect scopes for enabled APIs, but Google says the list does not always include scopes used by built-in services. Those scopes must be added manually. A code editor and a Cloud Console candidate list can therefore both be useful without proving that the final sets match.

Source: [Apps Script OAuth client verification](https://developers.google.com/apps-script/guides/client-verification).

## Official lint and ScopeParity have different boundaries

| Question | Google Workspace IDE extension | ScopeParity | Still manual |
|---|---|---|---|
| Is the scope understandable while I edit code? | Documented scope linting, autocomplete, and inline help | Reports tracked literal scopes and their source locations | Dynamic scope construction may require review |
| Do tracked source scopes match the intended submission set? | Not documented on the official extension page | Deterministic source-to-manifest set comparison | Confirm the manifest reflects the real Cloud project |
| Does each declared scope map to a product feature and demo step? | Not documented on the official extension page | Checks the secret-free feature and recording trace | Record and inspect the final live-product video |
| Do homepage, privacy, redirect, and authorized-domain hosts agree? | Not documented on the official extension page | Checks objective host consistency in the supplied manifest | Confirm ownership and actual Console values |
| What is currently configured in Google Cloud Console? | No Console-state inspection is documented | Never signs in or reads Console state | Compare the final Console screen yourself |
| Will Google approve the app? | No approval prediction | No approval prediction | Google's reviewers decide |

This comparison is deliberately asymmetric. Google's extension is first-party code-time guidance. ScopeParity is an independent, credential-free consistency check over inputs you control. It is not a replacement, wrapper, or endorsement.

## Use both in this order

1. **Lint while coding.** Use Google's extension to choose and understand the narrowest scopes that support the feature.
2. **Record submission intent.** Create `oauth-evidence.yaml` with non-secret app identity, authorized domains, declared scopes, feature routes, and planned recording steps.
3. **Stop drift in pull requests.** Run the same ScopeParity check locally and in GitHub Actions.
4. **Compare the real launch surfaces.** Before recording, manually compare the manifest with the production Cloud Console and the live product.
5. **Record and submit.** Capture the actual OAuth flow and feature use. Google—not either tool—makes the verification decision.

```yaml
- uses: actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0 # v7.0.0
- uses: sora-volare0319/scopeparity-cli@v1.0.0
  with:
    manifest: oauth-evidence.yaml
    report: scopeparity-report.html
```

[Inspect the released GitHub Action](https://github.com/sora-volare0319/scopeparity-cli/releases/tag/v1.0.0) or run the same free scanner locally:

```bash
npx -y github:sora-volare0319/scopeparity-cli#v0.1.4 scan . --manifest oauth-evidence.yaml
```

## When the parity check is unnecessary

Do not add a verification workflow only because an app uses Google Sign-In. Internal-only apps, personal-use projects, development or test projects, and apps requesting only basic profile scopes can fall outside verification requirements. Qualify the project first with [Google's published exemptions](https://support.google.com/cloud/answer/13464321?hl=en) and the [ScopeParity verification-not-required guide](/guides/when-verification-not-needed/).

If the project requests a restricted scope, ScopeParity stops at that boundary. It does not assess CASA, security controls, policy compliance, or legal sufficiency.

## What the paid workspace adds

The Action and all diagnostic findings remain free. The paid Launch Evidence Workspace is for teams that need a versioned scope-evidence matrix, recording plan, provenance record, and repeatable evidence-production workflow after the free parity check. [See the current price and sales status](/?utm_source=guide&utm_medium=official-lint-comparison&utm_campaign=action-v1#pricing) before relying on availability.

ScopeParity is independent and is not affiliated with Google. A clean report means only that the bounded technical inputs supplied to the scanner are internally consistent.
