---
title: "Google OAuth scope not showing: check the request, API, and Data Access"
description: "Separate a missing Data Access entry from a missing consent prompt, then compare shipped scope strings with the launch configuration."
intent: "google oauth scope not showing consent screen data access"
slug: "scope-not-showing-on-consent-screen"
published: "2026-07-18"
updated: "2026-07-18"
---

# A missing OAuth scope can be a Console problem or a runtime-request problem

A scope can be absent in two different places: the Google Auth Platform Data Access list, or the user-facing consent flow. For Data Access, Google says only scopes for enabled APIs appear automatically; enable the API or add the scope manually. For the user flow, inspect the exact authorization request before changing Cloud configuration.

Start by naming the surface where the scope is missing. The checks are different, and treating them as one problem can create a second mismatch.

| Where the scope is missing | First evidence to inspect | Commonly confused with |
| --- | --- | --- |
| Data Access scope picker | Whether the corresponding API is enabled; whether the scope must be entered manually | What production code actually requests |
| Data Access saved tables | The selected scopes after clicking **Update** and their displayed classifications | A submitted or approved scope set |
| User-facing authorization flow | The exact `scope` parameter on that code path and the account's prior grants | The scope list saved in Cloud Console |
| Token response | The scopes Google says the account granted | The literal string originally requested |

Google notes that an API can map more than one requested scope string to the same returned scope. A token response is therefore runtime evidence, but it is not always a byte-for-byte copy of the authorization request.

## If the scope is absent from Data Access

Check these conditions in order:

1. **Enable the API that owns the scope.** Google documents that only scopes for enabled APIs are listed in the scope table.
2. **Search the canonical scope string.** Compare it with the current OAuth 2.0 scope reference for that API, including punctuation and path segments.
3. **Use “Manually add scopes” when necessary.** Google provides this route for a valid scope that is not listed automatically.
4. **Check every OAuth client for non-HTTPS URLs.** Google says certain scopes can be unavailable to projects whose clients contain non-HTTPS URLs.
5. **Click Update and inspect the saved table.** Confirm the scope appears under the expected non-sensitive, sensitive, or restricted classification before treating the Console configuration as changed.

Do not put a newly added sensitive or restricted scope into a production authorization request merely to see whether it appears. Google warns that requesting a new scope before it is verified can show users the unverified-app warning.

## If the scope is absent from the user-facing flow

The Cloud Console does not add a scope to an authorization request. Inspect the route that creates the Google authorization URL and record the exact scope set it sends.

Look for:

- incremental authorization that requests the scope only after a feature action;
- a feature flag or alternate OAuth client that selects a different scope list;
- library defaults that add or normalize identity scopes;
- an account that already granted some permissions and is not prompted again;
- granular consent where the account did not grant every requested permission.

Google recommends requesting access incrementally when the user invokes the feature that needs it. The same app can therefore have several legitimate authorization paths. Your verification evidence needs to cover the path that actually requests each reviewed scope, not only the first sign-in route.

Do not use the number of permission checkboxes as a scope inventory. Google's granular-permissions guide says the checkbox-style screen applies when a request combines Sign-In and non-Sign-In scopes, or contains more than one non-Sign-In scope. It does not apply to Sign-In scopes alone or to one non-Sign-In scope alone. The app must inspect what the user actually granted.

Likewise, forcing `prompt=consent` is not a substitute for finding the request that omitted the scope. Google permits a consent prompt, but its guidance is to request permissions in context and only prompt again after the user clearly chooses the feature that needs them.

## Compare shipped code with the intended scope set locally

Create a secret-free manifest in the repository:

```bash
npx -y github:sora-volare0319/scopeparity-cli#v0.1.4 init .
```

Replace the example values with the scope set you intend to configure and submit, then scan tracked source files:

```bash
npx -y github:sora-volare0319/scopeparity-cli#v0.1.4 scan . \
  --manifest oauth-evidence.yaml \
  --report scopeparity-scope-inventory.html
```

The report can show literal scope strings found in Git-tracked source, their file locations, and differences from the manifest. It does not read the current Cloud Console, execute dynamic scope construction, inspect a user's grant, or predict how Google will render a particular authorization flow.

## Reproduce the code-to-manifest mismatch without an account

The [scope-set drift before/after fixture](/examples/scope-drift/) publishes synthetic source, a secret-free manifest, and both reports. The before state requests a Calendar scope in code that the manifest does not declare; the after state makes the two bounded inputs agree.

Use the fixture to understand the scanner contract, then run it on your own repository. Do not copy the fixture's scopes into a real project unless the implemented feature actually requires them.

## Official sources

- [Google: Manage App Data Access](https://support.google.com/cloud/answer/15549135?hl=en)
- [Google: Using OAuth 2.0 to Access Google APIs](https://developers.google.com/identity/protocols/oauth2)
- [Google: OAuth 2.0 for Web Server Applications](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Google: How to handle granular permissions](https://developers.google.com/identity/protocols/oauth2/resources/granular-permissions)
- [Google: Sensitive scope verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification)

These sources describe Google’s current product behavior and review requirements. ScopeParity checks a narrower, local technical contract and is not affiliated with Google.
