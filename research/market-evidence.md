# Market evidence log

Snapshot date: 2026-07-18

This file separates observed evidence from the commercial hypothesis. URLs should be refreshed before public claims are shipped.

## Primary observations

| Observation | Evidence | Product implication |
| --- | --- | --- |
| An external app showing the unverified screen can be capped at 100 new users total | [Google: Unverified apps](https://support.google.com/cloud/answer/7454865?hl=en), [Manage app audience](https://support.google.com/cloud/answer/15549945?hl=en) | This is a launch blocker with a concrete upper bound, not a vague best practice |
| Code-requested scopes must match consent-screen scopes | [Google: Unverified apps](https://support.google.com/cloud/answer/7454865?hl=en) | Source-to-manifest diff is an officially supported mechanical check |
| New sensitive/restricted scopes can produce the warning before approval | [Google: Manage app data access](https://support.google.com/cloud/answer/15549135?hl=en) | CI scope drift has value after the first submission |
| Homepage, privacy link, app identity, domain ownership, scope justification, and demo evidence are review surfaces | [Google: Verification requirements](https://support.google.com/cloud/answer/13464321?hl=en), [Submitting an app](https://support.google.com/cloud/answer/13461325?hl=en) | Evidence must reconcile multiple surfaces; a scope grep alone is not the product |
| Changes to name, logo, redirect URI, homepage, or privacy-policy link can require brand re-verification | [Google: Changes to approved app](https://support.google.com/cloud/answer/13464018?hl=en) | Public identity and redirect drift belong in the contract |
| Restricted Gmail and Drive scopes have an explicit official list and can require security assessment | [Google: Restricted scopes](https://support.google.com/cloud/answer/13464325?hl=en), [Restricted-scope verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification) | Product must stop at a versioned restricted-scope boundary |
| A narrow vendor-specific concierge sells OAuth setup/verification assistance for $495 and reports hundreds of customers | [CloudSponge Setup Concierge](https://www.cloudsponge.com/setup-concierge/) | Establishes paid pain and a price anchor, but not self-serve conversion |

## Recent problem signals

These are demand signals, not authoritative requirements.

- A Google Developer Forum report describes repeated submission rejection because scope-justification and demo-video fields appeared to reset after submission: [forum report](https://discuss.google.dev/t/data-access-fields-reset-immediately-after-submission-scope-justification-and-demo-video-not-saving/359476).
- Developers continue to report confusion where the consent screen appears verified but an unverified warning remains after changes: [Google Cloud discussion](https://www.reddit.com/r/googlecloud/comments/1po6tq9/google_oauth_says_app_hasnt_been_verified_even/).
- Developers describe broad default scopes triggering an unverified experience before the associated feature launches: [build-in-public report](https://www.reddit.com/r/buildinpublic/comments/1uwpihk/one_oauth_scope_was_killing_my_signup_conversion/).

Public posts can be incomplete or wrong. They inform content vocabulary and fixtures; Google documentation remains the rule source.

## Unproven assumptions

- A self-serve technical compiler can capture enough of the $495 concierge willingness to pay at $399.
- At least 15% of qualified landing-page visitors will complete a local CLI scan.
- At least 20% of completed scans will purchase the evidence-production workspace.
- A 30-day update entitlement is more valuable than a one-off report alone.
- Developers will supply a secret-free manifest rather than abandon setup.

These assumptions require purchase and usage evidence. None should be presented as a market fact.
