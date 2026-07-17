---
title: "OAuth verification ‘Cancelled: Project Changes’: compare the submission snapshot"
description: "Diagnose a cancelled Google OAuth review by separating Cloud Console changes from repository and launch-evidence drift."
intent: "oauth verification cancelled project changes rejected frequent requests"
slug: "cancelled-project-changes"
published: "2026-07-18"
updated: "2026-07-18"
---

# “Cancelled: Project Changes” means the pending review no longer matches

Google documents an automated cancellation state for a verification request whose project configuration changed while review was pending. Examples include removing the scope that triggered review, changing the publishing status to Testing, or changing the user type to Internal.

The cancellation applies to that pending request; it does not by itself erase an existing approved configuration. Treat it as a snapshot mismatch, not as a prompt to click Submit repeatedly.

Google also documents a separate “Rejected: Frequent Requests” state. Repeated submissions can start a cooldown, and another attempt during that period can extend it. Follow the notification attached to the actual project rather than guessing a resubmission time from a generic checklist.

## Capture two snapshots before changing anything else

First, record the current Google Cloud values manually:

- user type and publishing status;
- requested scopes;
- app name and branding state;
- homepage and privacy-policy URLs;
- OAuth clients, redirect URIs, and JavaScript origins;
- project contacts and the last reviewer message.

Then capture the technical launch state from the repository and secret-free manifest:

- literal scopes requested by tracked source;
- declared submission scopes;
- authorized domains and redirect hosts;
- app name, homepage, and privacy-policy values;
- feature and recording-step mappings;
- ruleset version, report ID, and manifest digest.

ScopeParity can produce the second snapshot without Google credentials. It cannot read the first one from Cloud Console.

## Generate a local comparison artifact

If the project does not yet have a manifest:

```bash
npx -y github:sora-volare0319/scopeparity-cli#v0.1.4 init .
```

After replacing the example values with the configuration you intend to submit, generate a versioned JSON report:

```bash
npx -y github:sora-volare0319/scopeparity-cli#v0.1.4 scan . \
  --manifest oauth-evidence.yaml \
  --report scopeparity-submission-snapshot.json
```

Keep that report private with the project. It contains no source lines or credentials, but it can still reveal internal paths and launch configuration.

## Compare causes in the right layer

| Possible change | ScopeParity can show | Must be checked manually |
| --- | --- | --- |
| Scope added or removed in source | Tracked literal scope diff | Dynamic runtime scope construction |
| Consent-screen scope changed | Manifest diff | Current Cloud Console value |
| Homepage, privacy URL, or redirect changed | Manifest and domain consistency | Current Cloud Console value and final public behavior |
| Publishing status or user type changed | Nothing | Cloud Console only |
| Repeated verification submissions | Nothing | Google notification and submission history |

Resolve the proven mismatch once, confirm the complete snapshot, and then follow Google’s stated next action. ScopeParity does not identify the authoritative cancellation cause, access reviewer correspondence, or determine when a cooldown has ended.

## Official sources

- [Google: Brand Approvals & Auto-Cancellations](https://support.google.com/cloud/answer/16868008?hl=en)
- [Google: Changes to an approved app](https://support.google.com/cloud/answer/13464018?hl=en)
- [Google: Submitting your app for verification](https://support.google.com/cloud/answer/13461325?hl=en)
