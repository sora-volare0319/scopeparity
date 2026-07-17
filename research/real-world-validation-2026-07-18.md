# Real-world open-source validation — 2026-07-18

## Purpose

Validate ScopeParity against active public repositories whose owners had already documented Google OAuth verification as a launch task. This was a product test, not an audit of either project. Project names and generated reports are intentionally omitted from the repository.

The temporary manifests used only values already stated in public issues, did not contain credentials, and were explicitly labeled as dated public snapshots rather than Google Cloud state.

## Repository A

- 2,276 eligible Git-tracked source files
- TypeScript application
- Public issue snapshot recorded four intended scopes and an unfinished demo video
- Current public source contained two additional literal Google scopes in the central runtime scope array
- The scan also skipped one tracked file containing a NUL byte and surfaced that skip for manual confirmation

The first run exposed one ScopeParity defect: a normal database `.select("email")` call was misclassified as a bare identity scope because a nearby comment used the word “Scoped.” The extractor was changed to tokenize camelCase and snake_case identifiers and require an exact OAuth context word. A regression test now proves that `googleOAuthScopes = ["openid", "email", "profile"]` is detected while an ordinary email field beside “Scoped” prose is not.

The second run retained the two full Google scope differences and removed the false `email` finding.

## Repository B

- 144 eligible Git-tracked source files
- Python application
- One literal YouTube scope in the runtime router
- Source and dated manifest scope set were in parity
- The missing per-scope recording step was the only objective launch-evidence blocker
- Domain ownership and the scope's current Console classification remained explicit manual checks

This result matters because a useful scan is not required to find scope drift. Confirming parity while isolating one missing evidence step is a valid pre-submission outcome.

## Product decisions from the run

- Bare `email`, `profile`, and `openid` strings require exact OAuth-context tokens; substring matches such as “Scoped” are rejected.
- A fetched homepage redirect to a different final URL is an objective finding because the network transition is observed.
- Reusing the homepage URL as the privacy URL is an objective configuration finding.
- Missing app-name or privacy-link text in non-rendered HTML is manual confirmation, not a blocker, because a JavaScript-rendered page may still expose it.
- Unknown scope classifications remain manual. ScopeParity does not infer a current Cloud Console category from a public issue or an API description.

## Verification evidence

- New extractor regression test passes.
- Both public repositories were rescanned with the bundled CLI v0.1.3 candidate.
- Repository A no longer emitted the ordinary-email false positive and retained the two full-scope differences.
- Repository B retained source/manifest parity and the missing-video-step finding.
- No report, manifest, source, project identifier, or credential was uploaded by ScopeParity.
