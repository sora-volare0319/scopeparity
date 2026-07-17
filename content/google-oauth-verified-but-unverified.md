---
title: "Google OAuth app verified—but users still see ‘unverified app’"
description: "A technical diagnostic for runtime scope drift, consent-screen scope mismatch, and post-verification identity changes."
intent: "google oauth verified but still unverified"
slug: "verified-but-unverified"
published: "2026-07-18"
updated: "2026-07-18"
---

# Verified—but the OAuth warning is still there

A green verification status does not prove that every authorization request your deployed app sends contains only approved scopes.

Google’s own FAQ identifies a concrete cause: a verified app can still show the unverified screen when the code requests a scope that is not included in the app’s approved scope set. Google also says that changes to an app name, logo, redirect URI, homepage, or privacy-policy link can require another brand review.

This page diagnoses those technical mismatches. It does not determine policy compliance or predict Google’s final decision.

## Check these surfaces in order

### 1. Capture the scopes in the failing authorization request

Inspect the `scope` parameter on the actual request that produces the warning. Do not rely only on a framework configuration file: libraries can add identity scopes, and incremental authorization can add a scope on a later feature path.

Normalize whitespace and compare complete scope strings. `drive.file` and `drive` are different grants with very different review consequences.

### 2. Find every source location that can build a scope set

Search tracked source and configuration files for `https://www.googleapis.com/auth/` and the OpenID scopes `openid`, `email`, and `profile`. Check feature flags, environment-specific configuration, worker processes, and mobile clients separately.

Do not paste client secrets or tokens into an online checker. A scope inventory needs strings and locations, not credentials.

### 3. Compare runtime scopes with the approved set

Google says the scopes requested by code should match the consent-screen configuration. The useful comparison is two-way:

- requested in code but absent from the approved set;
- declared for review but no longer requested by the product.

The first can create an unverified warning. The second can make the submission harder to explain and may indicate an unnecessarily broad request.

### 4. Check post-verification identity changes separately

If the scope sets match, compare the current app name, redirect URI, homepage, and privacy-policy URL with the values that were reviewed. Google documents that changes to these surfaces can trigger brand re-verification.

### 5. Reproduce with the intended production client

Confirm which OAuth client created the warning. Development, staging, browser, mobile, and production clients can live in the same project but use different redirect paths and code branches.

## Run a local scope diff

For a first run, create the secret-free manifest and replace the example values with the launch values you intend to submit:

```bash
npx -y github:sora-volare0319/scopeparity-cli#v0.1.4 init .
```

Then run the local comparison:

```bash
npx -y github:sora-volare0319/scopeparity-cli#v0.1.4 scan . --manifest oauth-evidence.yaml
```

ScopeParity reads tracked, allowed source files and compares scope strings with a secret-free manifest. It reports file paths and line numbers, never source lines, and does not ask for Google credentials.

## What this cannot tell you

A matching scope set does not mean that Google will approve the app. Reviewers also evaluate whether the feature and use case support the requested access, whether a narrower scope is sufficient, and whether the public disclosures accurately describe data use. Those are outside a deterministic source/config comparison.

## Inspect the reproducible example

Inspect the [scope-set drift before/after fixture](/examples/scope-drift/) to compare current runtime literals with a stale submission snapshot without implying access to the live Google Cloud project.

## Official sources

- [Google: Unverified apps](https://support.google.com/cloud/answer/7454865?hl=en)
- [Google: OAuth verification FAQ](https://support.google.com/cloud/answer/13463817?hl=en)
- [Google: Changes to an approved app](https://support.google.com/cloud/answer/13464018?hl=en)
