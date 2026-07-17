---
title: "Google OAuth homepage verification failed: check the URL before rewriting the page"
description: "Separate reachable URLs, redirects, domains, app identity, and privacy links from the homepage questions that still require human review."
intent: "google oauth homepage verification failed redirects different domain behind login privacy link"
slug: "homepage-verification-failed"
published: "2026-07-18"
updated: "2026-07-18"
---

# Prove the public URL path before judging the page

Google lists several homepage failure modes that look similar in a rejection email but require different fixes. A homepage can be unresponsive, redirect to another URL or domain, sit behind login, omit the privacy-policy link, or fail to identify the submitted app.

Start with facts that an HTTP request and a secret-free launch snapshot can establish. Do not rewrite the privacy policy or product description until you know which surface actually differs.

## Separate mechanical checks from reviewer judgment

| Question | What a local check can establish | What remains human work |
| --- | --- | --- |
| Does the homepage respond? | HTTPS status, supported text content type, bounded response, and final URL | Whether intermittent production behavior differs |
| Does it redirect? | Whether the submitted URL reaches a different final URL | Which public URL should become canonical |
| Do the domains agree? | Homepage, privacy, redirect, and declared authorized-domain relationships | Search Console ownership and Cloud roles |
| Is the privacy link present? | Whether the exact URL or path appears in fetched HTML | Whether client-rendered UI exposes it and whether the policy content is sufficient |
| Is the app name present? | Whether the exact submitted name appears in fetched HTML | Whether the rendered identity and description are clear enough |
| Is the homepage behind login? | A redirect to a login URL is observable | Whether an unauthenticated reviewer can understand the app in a real browser |

The last column is deliberate. A raw HTML fetch does not execute the app, inspect Google Cloud, decide whether a privacy policy is adequate, or predict a review outcome.

## Run the bounded public check

Create the secret-free manifest if the project does not have one:

```bash
npx -y github:sora-volare0319/scopeparity-cli#v0.1.4 init .
```

Record the homepage, privacy-policy URL, authorized domains, redirects, and intended app name. Then opt in to the network check:

```bash
npx -y github:sora-volare0319/scopeparity-cli#v0.1.4 scan . \
  --manifest oauth-evidence.yaml \
  --check-urls \
  --report scopeparity-homepage-check.html
```

The request is HTTPS-only, allows only the standard HTTPS port, resolves DNS before every redirect, rejects private and metadata addresses, limits redirects, response size, and duration, and never sends repository content or credentials.

## Read the findings literally

- **`HOMEPAGE_REDIRECT_CHANGED_URL`** means the bounded request reached a final URL different from the submitted homepage. Google’s homepage guidance says the consent-screen homepage should be a static URL rather than a redirect to another URL or domain.
- **`PRIVACY_URL_EQUALS_HOMEPAGE`** means the two submitted values are the same. Google asks for a dedicated privacy-policy page with a different URL.
- **`PRIVACY_LINK_NOT_FOUND_ON_HOMEPAGE`** means the expected link was absent from fetched, non-rendered HTML. It is a manual confirmation, not proof that a JavaScript-rendered page omits the link.
- **`APP_NAME_NOT_FOUND_ON_HOMEPAGE`** has the same boundary: confirm the rendered page before changing the submitted name.
- **`PUBLIC_URL_CHECK_FAILED`** records the bounded failure instead of pretending the page was inspected.

These results describe observable technical surfaces. They do not judge the privacy-policy text, Limited Use disclosures, domain ownership, brand distinctiveness, or the sufficiency of the product explanation.

## Check the reviewer path in a clean browser

After the mechanical findings are resolved, open the exact submitted homepage in a signed-out browser session. Confirm that it identifies the app, explains the user-facing purpose, exposes the same privacy link, and does not require an account before those facts are visible.

Keep that browser check separate from the scanner report. A deterministic report should not claim that a human-review question has been answered by an HTTP fetch.

## Inspect the reproducible example

Inspect the [public identity configuration before/after fixture](/examples/identity-config/) to see a duplicated privacy URL and an unlisted redirect host resolved without claiming that public-page content was reviewed.

## Official sources

- [Google: App Homepage](https://support.google.com/cloud/answer/13807376?hl=en)
- [Google: App Privacy Policy](https://support.google.com/cloud/answer/13806988?hl=en)
- [Google: App Identity & Branding](https://support.google.com/cloud/answer/13804963?hl=en)
