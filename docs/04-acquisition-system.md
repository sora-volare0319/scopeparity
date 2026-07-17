# Acquisition system

Last reviewed: 2026-07-18

## Principle

Distribution starts at the moment a developer sees a precise warning or prepares a verification submission. ScopeParity should earn the next click by resolving part of that problem immediately, not by publishing broad “What is OAuth?” content.

## High-intent page map

Each page must contain an exact diagnostic tree, a reproducible local check, a link to the relevant Google source, and a clear statement of what still requires human review.

| Search intent | Useful page, not clickbait | Product bridge |
| --- | --- | --- |
| “Google app is verified but still shows unverified” | Compare runtime scopes with approved scopes; explain identity changes separately | Run local code-to-manifest scope diff |
| “Sign in with Google temporarily disabled 100 users” | Identify whether the app is external, sensitive/restricted, and beyond the cap | Inventory the runtime scopes before resubmitting |
| “OAuth scopes not showing on consent screen” | Trace literal scopes, library defaults, and incremental-auth branches | Show every source location without printing source lines |
| “Google OAuth verification demo video rejected” | Shot list for consent flow and feature use per scope | Generate the per-scope storyboard |
| “Changed Google OAuth scope re-verification” | Separate code, consent, brand, and redirect changes | Add CI drift guard |
| “Google OAuth privacy policy URL mismatch” | Test URL/domain/link consistency without judging policy text | Run opt-in public-surface checks |
| “Brand verification vs sensitive scope verification” | Qualification decision tree | Explain when ScopeParity is useful and when it is not |
| “Does my app need Google OAuth verification?” | Official exemptions and scope categories | Disqualify basic/internal/personal apps honestly |
| “Restricted vs sensitive Google OAuth scope” | Show the hard security-assessment boundary | Stop ScopeParity and route to official guidance |

## Free utility loop

The free product must be complete enough to be trusted:

```bash
npx -y github:sora-volare0319/scopeparity-cli#v0.1.3 init .
# Edit the generated secret-free manifest, then:
npx -y github:sora-volare0319/scopeparity-cli#v0.1.3 scan . --manifest oauth-evidence.yaml
```

It shows the scope inventory, every objective finding, source locations without source lines, an optional public-surface check, and HTML/JSON diagnostic output. The output includes a stable report ID derived locally from the ruleset and manifest, but no repository content or identifier is sent anywhere.

Every useful report naturally creates one of three shareable artifacts:

- a small finding excerpt for an issue or pull request;
- the self-contained HTML diagnostic report;
- a sanitized sample report a developer can send to a cofounder.

Sharing is optional. The tool never auto-posts.

## Public issue demand radar

Current public-signal validation found the strongest reachable cohort in open GitHub issues where a repository owner has already named Google OAuth verification as the final launch blocker. This is more qualified than broad founder communities because the issue usually exposes the supported language, literal scope, implementation route, public-page status, and missing evidence step.

Use two narrow searches rather than a scraped lead list:

```text
"Google verification" "demo video" scope in:body is:issue is:public state:open created:>=2025-07-01
"Google OAuth" "scope justification" in:body is:issue is:public state:open created:>=2025-07-01
```

Before drafting any reply:

1. confirm the issue is still open and owner-maintained;
2. reject restricted-scope work and basic/internal/test-only apps;
3. reproduce one useful observation against public source using a manifest derived only from the dated public issue;
4. label the result as source-versus-public-snapshot evidence, never as the current Cloud Console state;
5. disclose ScopeParity maintainership and lead with the free command, not the paid product.

Do not auto-comment, collect private contact data, or turn an open issue into claimed purchase interest. Prepare at most two high-confidence, technically useful drafts per week so this channel stays evidence-led rather than becoming forum spam.

## 14-day payment validation

Day 1 is the first day both the public sample workspace and a refundable reservation checkout are live. The checkout must display one absolute refund date and state that the reservation is automatically refunded if delivery has not occurred by that date.

| Days | Work | Evidence expected |
| --- | --- | --- |
| 1–2 | Publish product page, sample report, CLI repository, and three exact-intent pages | Searchable URLs and working local command |
| 3–5 | Answer existing public questions where the scanner genuinely reproduces the issue; submit CLI to relevant package directories | Qualified referral sessions, not impressions |
| 6–8 | Publish three sanitized failure fixtures and their before/after reports | Scan completions and issue feedback |
| 9–11 | Improve the largest scan-completion drop and publish two additional exact-intent pages | Better visit-to-scan rate |
| 12–14 | Keep only sources producing completed scans; offer the same refundable reservation to every qualified visitor | Three paid reservations or stop |

No fake testimonials, invented customer counts, discount countdowns, cold-call lists, or automated forum spam.

After a production content change is live, submit only the canonical sitemap URLs through IndexNow. The checked-in ownership file and `pnpm submit:indexnow` validate the host boundary before posting. An HTTP 200 or 202 proves receipt, not crawling, indexing, ranking, or traffic. Google discovery continues through crawlable internal links, `robots.txt`, the sitemap, and Search Console when the seller connects an account; the deprecated Google sitemap ping endpoint is not used.

## Measurement contract

The website uses aggregate, cookie-free route analytics after disclosure. The CLI remains telemetry-free and sends nothing automatically.

Until live checkout exists, use only these validation signals:

- high-intent route visits from aggregate website analytics, excluding internal QA and obvious bots where the provider permits;
- valid `scan-feedback` issues from distinct GitHub authors as a conservative lower bound on completed scans;
- valid `workspace-interest` issues as a priced purchase-intent signal, never as a reservation or sale;
- the completed-scan clarity rate from the structured feedback choices.

The opt-in issue count cannot establish the true visit-to-scan conversion rate. Do not join public GitHub identities to anonymous website visitors.

When checkout is live, the durable provider-side events are:

- `checkout_started` with currency and offer;
- `purchase_settled` from server-side payment confirmation;
- `refund_settled`;
- `reservation_settled`;
- `reservation_refunded`.

Revenue reporting uses payment-provider events as the source of truth. Client-side success pages, public interest issues, unpaid invoices, test orders, and unsettled reservations never count as revenue.

## Growth guardrails

- Do not expand to generic OAuth security scanning; OAuthLint already serves that job.
- Do not produce programmatic thin pages by scope name alone.
- Do not use “pass,” “approval,” “compliance,” or “certification” in claims.
- Do not buy ads until organic qualified traffic converts.
- Do not add human onboarding calls to compensate for unclear product UX.
- Do not count internal, basic-sign-in, or restricted-scope traffic as qualified demand.
