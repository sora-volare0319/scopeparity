---
title: "Add a Google OAuth scope to a verified app: safe re-verification order"
description: "Stage a new sensitive Google OAuth scope, verification evidence, and production code without exposing existing users to an unapproved-scope warning."
intent: "google oauth add scope verified app re-verification unverified warning"
slug: "scope-change-reverification"
published: "2026-07-18"
updated: "2026-07-18"
---

# Add a sensitive scope without putting production ahead of approval

Adding a sensitive scope to a verified Google OAuth app requires verification for that scope before production requests it. Google recommends testing new scopes in a separate project. Changing only the app name, logo, redirect URI, homepage, or privacy-policy link requires brand verification again, but not new scope justification when the requested scopes are unchanged.

The practical problem is sequencing: the production code, Data Access configuration, justification, and demonstration must converge without shipping an unapproved authorization request in the middle.

## Which Google OAuth changes require re-verification?

| Change | Google-documented review path | Technical evidence to freeze |
| --- | --- | --- |
| Add a sensitive scope | Add justification and submit the new scope for verification | Runtime scope set, implemented feature, per-scope recording step |
| Add a restricted scope | Follow restricted-scope verification and security-assessment guidance | Outside ScopeParity's supported workflow |
| Change app name, logo, redirect URI, homepage, or privacy-policy link | Complete brand verification again | Public URLs, redirect hosts, and app identity values |
| Change branding while keeping the same requested scopes | Brand re-verification; no additional scope justification | Proof that the requested scope set did not change |
| Test an unapproved new scope | Use a separate development or testing project | Test client and environment boundary |
| Remove a scope | Remove it from runtime requests and Data Access | A before/after scope inventory |

Restricted scopes can also introduce security-assessment requirements that ScopeParity does not assess. If the new scope is classified as restricted, stop the local launch-evidence workflow and follow Google's restricted-scope guidance.

## Stage a new scope without breaking the verified production flow

Google's documented order and the local evidence checks combine into this release sequence:

1. **Create or use a separate test project.** Configure its OAuth client and consent screen for the new scope.
2. **Implement and test the feature there.** Verify the exact authorization path, requested scope, granted scope, and feature behavior.
3. **Inventory the production release candidate.** Compare every literal scope in tracked code with the secret-free launch manifest.
4. **Add the new scope to the production project's Data Access configuration.** Provide the justification and demonstration evidence Google requests.
5. **Submit and wait for the scope to be approved.** Do not make the production authorization request use the new scope during this interval.
6. **Release the production code path after approval.** Re-run the same inventory and retain the report with the release commit.
7. **Guard the scope set in CI.** A later code change should fail visibly when it adds an undeclared scope or leaves a declared scope unused.

Google warns that if production starts requesting a new sensitive or restricted scope before approval, users can see the unverified-app screen and the app can become subject to the 100-user cap.

## Remove a scope from both sides of the contract

Google says that after removing a scope from Data Access, the app must also stop requesting it. Using an unregistered scope—even one previously verified—can produce the unverified-app warning.

For a controlled release, first identify every runtime request path, deploy the narrower code, verify that the removed scope is no longer requested, and then update the saved Data Access set. That order is an operational inference intended to avoid a period where production asks for a scope the project no longer declares; confirm it against your own release architecture.

## Generate a release-scoped diff

If the repository does not have a manifest yet:

```bash
npx -y github:sora-volare0319/scopeparity-cli#v0.1.4 init .
```

After entering the intended post-change values, generate both JSON for CI and HTML for a human review:

```bash
npx -y github:sora-volare0319/scopeparity-cli#v0.1.4 scan . \
  --manifest oauth-evidence.yaml \
  --report scopeparity-release.html
```

ScopeParity can detect literal scope additions and removals in Git-tracked source, compare them with the manifest, and verify that each declared scope has a feature and recording-step mapping. It cannot see approval state, Cloud Console history, reviewer messages, runtime-generated scope strings, or whether a security assessment is required.

The [scope-set drift before/after fixture](/examples/scope-drift/) shows the exact input change and deterministic report change. If a verification request was cancelled while configuration changed, use the separate [“Cancelled: Project Changes” snapshot diagnostic](/guides/cancelled-project-changes/).

## Official sources

- [Google: Changes to approved app](https://support.google.com/cloud/answer/13464018?hl=en)
- [Google: Manage App Data Access](https://support.google.com/cloud/answer/15549135?hl=en)
- [Google: Requesting Minimum Scopes](https://support.google.com/cloud/answer/13807380?hl=en)
- [Google: Verification requirements](https://support.google.com/cloud/answer/13464321?hl=en)
- [Google: Sensitive scope verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification)

These sources control the review requirements. The sequence above adds a local technical evidence layer; it is not an approval guarantee or a substitute for Google’s instructions.
