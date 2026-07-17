---
title: "Google OAuth scope justification rejected: trace each scope to shipped code"
description: "Separate implemented scope need from roadmap intent, then build a source-to-feature trace before resubmitting Google OAuth verification."
intent: "google oauth verification scope justification rejected future enhancements"
slug: "scope-justification-rejected"
published: "2026-07-18"
updated: "2026-07-18"
---

# A scope justification is evidence, not persuasive copy

Google requires requested scopes to support features that are already implemented. Its verification guidance specifically calls out requests made for future enhancements, scope sets that differ between submission surfaces, and explanations that do not show why a narrower grant would fail.

That leaves two separate questions:

1. **Can the project prove that every submitted scope belongs to a shipped feature?**
2. **Is each scope the narrowest grant that feature genuinely needs?**

Software can help with the first question. The second still needs a product owner to understand the API behavior and make a defensible choice.

## Build one trace for every requested scope

For each scope, line up four pieces of evidence:

1. the tracked source location that requests it;
2. the exact value intended for the consent-screen configuration;
3. one implemented, user-facing feature and its route;
4. one recording step that visibly exercises that feature.

Three drift patterns deserve attention before anyone rewrites the justification:

- **Declared but absent from source:** the scope may describe a roadmap feature, stale implementation, generated code outside the scan boundary, or a source path that still needs manual inspection.
- **Requested by source but absent from the manifest:** production can ask for a grant that the planned submission does not explain.
- **No feature or recording step:** the scope exists, but the evidence chain does not show what the user can do with it.

Do not turn these findings into an automatic delete list. Google publishes a specific sequence for changing scopes on an already approved production project, and changing a pending configuration can affect the active review. Capture the current state first, then follow the official instructions for the project you actually have.

## Run the local trace

Create and review the secret-free manifest:

```bash
npx -y github:sora-volare0319/scopeparity-cli#v0.1.3 init .
```

Map each declared scope to an implemented feature and recording step, then scan:

```bash
npx -y github:sora-volare0319/scopeparity-cli#v0.1.3 scan . \
  --manifest oauth-evidence.yaml \
  --report scopeparity-scope-trace.html
```

ScopeParity reports literal scope strings, tracked source locations, feature mappings, and missing evidence. It does not read Google Cloud, inspect runtime traffic, or decide whether a broader scope is justified.

## Turn the result into a reviewable matrix

Keep one row per scope with these columns:

- exact scope;
- source location;
- implemented feature and route;
- why a narrower scope would not support that feature;
- recording step;
- manual owner and last confirmation date.

The scan can establish the first three fields and flag a missing recording step. The narrowness explanation and final wording remain human decisions. A clean trace is not an approval prediction.

## Official sources

- [Google: Requesting Minimum Scopes](https://support.google.com/cloud/answer/13807380?hl=en)
- [Google: Verification requirements](https://support.google.com/cloud/answer/13464321?hl=en)
- [Google: Changes to an approved app](https://support.google.com/cloud/answer/13464018?hl=en)
