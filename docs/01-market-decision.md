# Market decision — Google OAuth launch evidence compiler

Last reviewed: 2026-07-18

## Decision

Build one local-first developer product that compares the Google OAuth scopes and identity surfaces a product actually ships with the non-secret configuration its owner intends to submit, then offers a paid workspace for producing and maintaining the resulting launch evidence.

It is not an approval service. It does not interpret privacy law, decide policy compliance, assess restricted scopes, sign in to Google Cloud, or promise that Google will approve an app. The paid outcome is narrower and testable: fewer avoidable technical inconsistencies before submission, and a complete technical storyboard for the demonstration video.

## Why this problem

Google explicitly states that:

- an unverified external app can be limited to 100 new users;
- scopes requested by code must match the OAuth consent-screen configuration;
- homepage, privacy-policy URL, verified domain, app identity, and the requested scopes are reviewed;
- sensitive-scope submissions require a demonstration video and scope justification;
- changes to scopes and identity surfaces can require re-verification.

Sources:

- [Unverified apps and the 100-user cap](https://support.google.com/cloud/answer/7454865?hl=en)
- [Verification requirements](https://support.google.com/cloud/answer/13464321?hl=en)
- [Submitting an app for verification](https://support.google.com/cloud/answer/13461325?hl=en)
- [Changes that require re-verification](https://support.google.com/cloud/answer/13464018?hl=en)

The public buying signal is also concrete. CloudSponge sells a narrow, hands-on Google OAuth setup concierge for $495 and says it has assisted hundreds of customers. That is not proof that a self-serve tool will sell, but it establishes that this launch blocker has supported a paid offer at the intended price point. [CloudSponge Setup Concierge](https://www.cloudsponge.com/setup-concierge/)

## Candidate comparison

| Candidate | Distribution without a brand | Can be deterministic | Trust burden | Competition | Decision |
| --- | --- | --- | --- | --- | --- |
| Google OAuth scope-drift and evidence compiler | High: exact error searches, CLI, GitHub Action | High for technical consistency; low for final approval | Low when local-only and credential-free | No exact equivalent found; adjacent OAuth security linters exist | Build |
| AI support outcome ledger | Medium | Low without conversation-level judgment | Very high because of PII and support transcripts | Intercom/Zendesk native QA plus independent tools | Reject for first product |
| Monetization contract test | High | High | Medium because of billing sandbox credentials | Raterunner already offers YAML, diff, Stripe dry-run, and CI as OSS | Reject |

## The wedge

The product is not another checklist. Its wedge is cross-surface evidence:

1. Extract requested Google OAuth scopes from tracked source files without uploading code.
2. Compare them with a user-supplied, secret-free submission manifest.
3. Check redirect hosts, declared domains, homepage identity, and privacy-link consistency.
4. Map every requested scope to the product feature and recording step that demonstrates its use.
5. Emit a free self-contained HTML/JSON diagnostic with rule IDs, source locations, official references, and the ruleset version; sell the repeatable evidence-production workspace after diagnosis.
6. Re-run the same contract in CI to catch scope drift before a release creates a re-verification surprise.

## Explicit no-go boundary

The product must stop and explain the boundary when it sees restricted scopes. It must never:

- claim “approved,” “verified,” “compliant,” or “guaranteed to pass”;
- write or judge privacy-policy content;
- judge Limited Use or legal/policy compliance;
- assess restricted-scope security requirements;
- request Google credentials, client secrets, service-account JSON, or console access;
- upload source files, telemetry, or scan output by default;
- use an LLM to decide whether a scope is necessary;
- imply endorsement by Google.

## Falsification criteria

This choice remains a hypothesis until it passes both gates.

### Product gate

- A new user reaches a first result in 10 minutes or less.
- At least 80% of documented, technically remediable failures in a 20-case fixture set are detected.
- No fixture containing a known critical mismatch is labelled ready.
- No secret file, symlink target, untracked file, binary, or source line content appears in output.

### Demand gate

Within 14 days of a production purchase path receiving qualified traffic:

- at least 100 high-intent visits;
- at least 10 completed local scans;
- at least 3 settled full-price purchases, or a 3% full-price purchase rate when the cohort is large enough to evaluate.

Email signups and compliments do not count. If the paid gate fails, stop this product rather than expanding features to rescue the idea.
