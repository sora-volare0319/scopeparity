---
title: "Google OAuth 100-user cap: what to verify before resubmitting"
description: "Qualify the cap, inventory unapproved runtime scopes, and separate technical drift from the human verification decision."
intent: "google oauth 100 user cap sign in temporarily disabled"
slug: "100-user-cap"
published: "2026-07-18"
updated: "2026-07-18"
---

# The 100-user cap is a lifetime launch constraint, not a daily quota

Google documents a 100-new-user cap for apps that present the unverified-app screen. The cap applies across the lifetime of the project and cannot simply be reset. If a verified app’s users still encounter the cap, Google says the authorization request can contain additional scopes that have not been approved.

Before changing code or resubmitting, establish which case you actually have.

## First, determine whether verification is required

Verification may not be mandatory for personal-use apps, development/testing projects, and qualifying internal apps. Those exemptions have exact conditions; they are not a workaround for a public SaaS launch.

If the production app is external and requests sensitive or restricted scopes for consumer accounts, plan for verification before public launch.

## Then inventory what production requests

Build a set from the actual authorization requests and every code path that creates them. Compare that set with the consent-screen Data Access configuration.

Look especially for:

- a feature launched behind a flag that added a scope;
- incremental authorization on a route missed by the original video;
- an SDK default that adds identity scopes;
- multiple clients in one project with different behavior;
- a broad Drive or Gmail scope left in an old configuration.

## Do not “fix” the cap by hiding scopes

Removing a scope from the consent configuration while production still requests it creates the mismatch Google warns about. Likewise, moving users to a new project to restart the count does not resolve the underlying launch readiness problem.

The mechanical objective is parity: production code, declared scopes, the feature explanation, and the demonstration should refer to the same grant set.

## Local preflight

For a first run, create the secret-free manifest and replace the example values with the launch values you intend to submit:

```bash
npx -y github:sora-volare0319/scopeparity-cli#v0.1.3 init .
```

Then run the local comparison:

```bash
npx -y github:sora-volare0319/scopeparity-cli#v0.1.3 scan . --manifest oauth-evidence.yaml
```

The free scan locates scope strings in tracked source files and compares them with a secret-free manifest. Restricted scopes trigger a boundary message because third-party security assessment and review are outside ScopeParity.

## Official sources

- [Google: Manage app audience and OAuth user cap](https://support.google.com/cloud/answer/15549945?hl=en)
- [Google: When verification is not needed](https://support.google.com/cloud/answer/13464323?hl=en)
- [Google: Manage app data access](https://support.google.com/cloud/answer/15549135?hl=en)
