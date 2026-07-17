# Commercial operations

Last reviewed: 2026-07-18

## Checkout decision

Use a Merchant of Record for the first global sales rather than building card handling and international sales-tax operations into ScopeParity.

The current implementation target is **Polar Starter**:

- hosted checkout links;
- Merchant of Record for global tax handling;
- one-time digital products;
- automated license-key and file-download benefits;
- no monthly fee at validation volume;
- published Starter fee of 5% + $0.50 per transaction as of 2026-07-18.

Sources: [Polar pricing](https://polar.sh/resources/pricing), [Merchant of Record](https://polar.sh/docs/merchant-of-record/introduction), [automated benefits](https://polar.sh/docs/features/benefits).

This is an operational choice, not tax or legal advice. Account review, seller identity, bank payout details, and the provider’s current country support must be verified in the actual account before accepting payment.

## Products

### Validation reservation

- Price: ¥19,800 equivalent, charged once.
- The hosted checkout shows an absolute refund date, not a rolling or ambiguous “14-day window.”
- Automatically refunded if the Launch Evidence Workspace is not delivered by that date.
- Converts to a ¥19,800 credit against the Launch Evidence Workspace only when the buyer explicitly completes that purchase.
- No claim that the app will be approved.

### Launch Evidence Workspace

- Price: ¥59,800 / $399, charged once.
- One named software project.
- Version-fixed local compiler download.
- Scope-evidence matrix in CSV/JSON, recording runbook, local storyboard workspace, public-surface result record, read-only CI workflow, and deterministic provenance record.
- Ruleset updates for 30 days.
- No call, Google login, console access, policy writing, restricted-scope assessment, or approval guarantee.

### Drift Guard

- Price: ¥9,800 / $69 monthly after initial validation.
- CI ruleset updates and refreshed evidence output.
- Not required to reach the initial ¥1,000,000 goal.

## Delivery design

Polar provides the checkout and versioned file-download entitlement. The product site receives only a public checkout URL. A successful purchase grants:

- the version-fixed paid compiler archive;
- install and local-run instructions;
- 30 days of updated downloads and changelogs.

The launch build performs no online license validation and sends no repository data. If online validation is added later, it must be disclosed and separable from both the scan and pack build.

Initial DRM is deliberately light. Avoid turning a privacy-first local tool into an always-online agent merely to prevent casual sharing.

## Revenue source of truth

Create an append-only revenue ledger from verified server-side provider events:

| Field | Meaning |
| --- | --- |
| `provider_event_id` | deduplication key |
| `occurred_at` | provider timestamp |
| `order_id` | provider order identifier |
| `product` | reservation, evidence workspace, or drift guard |
| `currency` | settlement currency |
| `gross_amount` | customer charge before tax treatment |
| `tax_amount` | tax handled by the provider |
| `refunded_amount` | settled refund |
| `net_goal_revenue_jpy` | gross less refunds, converted by a documented daily rate when needed |
| `acquisition_source` | first-party intent-page attribution if present |

Never count a browser redirect, checkout-start event, unpaid invoice, test-mode order, tax collected, or refunded amount as goal revenue.

## Implementation boundary

The site reads its purchase destinations from environment variables:

- `VITE_RESERVATION_CHECKOUT_URL`
- `VITE_EVIDENCE_CHECKOUT_URL`

An unset URL must render a labelled preview state, never a fake checkout. Provider credentials and webhook secrets are server-only and must not appear in Vite environment variables.

## External onboarding dependency

Opening a live Merchant of Record store requires the seller’s identity, payout destination, and provider approval. Those cannot be fabricated or delegated to code. The site, product, sample report, and test-mode integration can be completed first; live payment acceptance becomes the first explicit external-account gate.
