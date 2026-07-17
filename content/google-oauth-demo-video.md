---
title: "Google OAuth verification demo video: build a scope-by-scope storyboard"
description: "Turn the scope set into a deterministic recording plan that covers the consent flow and the product feature using each requested scope."
intent: "google oauth verification demo video rejected requirements"
slug: "demo-video"
published: "2026-07-18"
updated: "2026-07-18"
---

# Record evidence, not a product tour

For sensitive or restricted scope verification, Google asks for a demonstration video showing the OAuth flow and how the app uses the requested access. A generic tour can look polished while omitting the exact evidence a reviewer needs.

The reliable unit of planning is one requested scope mapped to one user-visible feature and one observable recording step.

## Build the storyboard from the scope set

For every requested scope, record:

1. the production app identity and starting route;
2. the user action that begins Google authorization;
3. the consent screen where the requested grant is visible;
4. the product action that depends on that grant;
5. the resulting user-visible behavior;
6. any separate OAuth client or platform assigned to the same project.

Keep the mapping explicit. “Calendar integration” is not a recording step. “Create an event in ScopeParity Sample, then open Google Calendar and show the new event” is.

## Catch scope/video drift before recording

The storyboard should be generated from the same normalized scope inventory used to compare code with the consent-screen values. Otherwise the video can faithfully demonstrate an outdated set.

Flag these objective gaps:

- a requested scope has no named feature;
- a named feature has no route or starting state;
- a scope has no recording step;
- the recording plan omits an OAuth client included in the project;
- code requests a scope absent from the submission manifest.

ScopeParity can flag those gaps, but it cannot decide whether the feature justifies the scope or whether Google will accept the demonstration.

## Generate the local storyboard

For a first run, create the secret-free manifest, replace the example values, and map each requested scope to a feature and recording step:

```bash
npx -y github:sora-volare0319/scopeparity-cli#v0.1.3 init .
```

Then generate the local report:

```bash
npx -y github:sora-volare0319/scopeparity-cli#v0.1.3 scan . \
  --manifest oauth-evidence.yaml \
  --report scopeparity-report.html
```

The report groups shots by scope and includes source locations, manifest evidence, and official references. It is a planning artifact, not an approval certificate.

## Official sources

- [Google: Verification requirements](https://support.google.com/cloud/answer/13464321?hl=en)
- [Google: Manage app data access](https://support.google.com/cloud/answer/15549135?hl=en)
- [Google: Submit an app for verification](https://support.google.com/cloud/answer/13461325?hl=en)
