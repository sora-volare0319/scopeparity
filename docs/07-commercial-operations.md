# Commercial operations

Last reviewed: 2026-07-18

## Checkout decision

Use a Merchant of Record for the first global sales rather than building card handling and international sales-tax operations into ScopeParity.

The current implementation target is **Polar Starter**:

- hosted checkout links;
- Merchant of Record for global tax handling;
- one-time digital products;
- signed file-download benefits;
- no monthly fee at validation volume;
- published Starter fee of 5% + $0.50 per transaction as of 2026-07-18.

Sources: [Polar pricing](https://polar.sh/resources/pricing), [Merchant of Record](https://polar.sh/docs/merchant-of-record/introduction), [automated benefits](https://polar.sh/docs/features/benefits).

This is an operational choice, not tax or legal advice. Account review, seller identity, bank payout details, and the provider’s current country support must be verified in the actual account before accepting payment.

## Launch product

### Launch Evidence Workspace

- Price: ¥59,800 / $399, charged once.
- One named software project.
- Version-fixed local compiler download.
- Scope-evidence matrix in CSV/JSON, recording runbook, local storyboard workspace, public-surface result record, read-only CI workflow, and deterministic provenance record.
- Permanent use of the version-fixed release delivered at purchase.
- Future releases and features are separate unless the checkout explicitly includes them.
- No call, Google login, console access, policy writing, restricted-scope assessment, or approval guarantee.

The initial checkout has one paid offer. A lower-priced reservation was removed because it adds refund dates, credit accounting, and a second conversion decision without improving the self-serve deliverable.

## Delivery design

Polar provides the checkout and versioned file-download entitlement. The product site receives only a public checkout URL. A successful purchase grants:

- the version-fixed paid compiler archive;
- install and local-run instructions;
- continued use of that purchased release for the named project.

The prepared buyer release is `v0.1.3`. Its archive is
`scopeparity-launch-evidence-workspace-0.1.3.tgz` with SHA-256
`afc928b2c8c76543fe12654b7590160106fa676f791a191070930e0a2b8e0d60`.

Polar's one-time File Download Benefit gives existing purchasers access to files later added to the product. It does not enforce a buyer-specific 30-day entitlement. ScopeParity therefore does not promise a 30-day update window in the initial offer; doing so would require a separate entitlement service. Sources: [file downloads](https://polar.sh/docs/features/benefits/file-downloads), [benefit access](https://polar.sh/docs/features/benefits/introduction).

The launch build performs no online license validation and sends no repository data. If online validation is added later, it must be disclosed and separable from both the scan and pack build.

Initial DRM is deliberately light. Avoid turning a privacy-first local tool into an always-online agent merely to prevent casual sharing.

## Revenue source of truth

Create an append-only revenue ledger from verified server-side provider events:

| Field | Meaning |
| --- | --- |
| `provider_event_id` | signed `webhook-id`; deduplicated with environment and endpoint key |
| `occurred_at` | provider timestamp |
| `order_id` | provider order identifier |
| `product` | evidence workspace |
| `currency` | settlement currency |
| `gross_amount` | Polar `net_amount`: after discounts and before tax |
| `tax_amount` | tax handled by the provider |
| `refunded_amount` | settled refund |
| `net_goal_revenue_jpy` | gross less cumulative tax-exclusive refunds, converted using a documented purchase-date rate when needed |
| `acquisition_source` | first-party intent-page attribution if present |

Never count a browser redirect, checkout-start event, unpaid invoice, test-mode order, tax collected, or refunded amount as goal revenue.

The checked-in `@scopeparity/revenue` package implements the provider contract before a live account is connected:

- validates the raw request body with the pinned official Polar SDK;
- accepts only `order.paid` and `order.refunded` for the ledger;
- persists an allowlisted snapshot without names, email, address, tax ID, raw body, or signature;
- claims `(provider, environment, endpoint, webhook-id)` atomically, deduplicates only an identical body hash, and records a different hash as a fail-closed conflict;
- acknowledges a durably quarantined conflict with `202 accepted_conflict` so provider retries cannot disable the endpoint, while requiring a safe-ID alert;
- derives refunds from Polar's cumulative snapshot instead of adding refund events;
- excludes sandbox, reservations, unknown products, zero-value orders, and missing FX rates from the goal; and
- returns a retryable failure when durable storage is unavailable.

`packages/revenue/sql/001_revenue_events.sql` defines the append-only Postgres table and native-currency audit view. A durable database, server endpoint, production IDs, and secrets remain deployment inputs; an ephemeral serverless filesystem is not an acceptable substitute.

## Implementation boundary

The site reads its purchase destinations from environment variables:

- `VITE_EVIDENCE_CHECKOUT_URL`

An unset URL must render a labelled preview state, never a fake checkout. Provider credentials and webhook secrets are server-only and must not appear in Vite environment variables.

The static guide builder receives Vercel Web Analytics' randomized first-party script path through `VERCEL_OBSERVABILITY_CLIENT_CONFIG`. Production must therefore be built from source on Vercel with `vercel deploy --prod` or the connected Git repository. A local `vercel build --prod` followed by `vercel deploy --prebuilt --prod` omits that system configuration and is rejected by the build guard. After deployment, verify one static guide contains `/analytics-init.js` and the generated first-party analytics script; the React home route uses the same official `@vercel/analytics` package at runtime.

## External onboarding dependency

Opening a live Merchant of Record store requires the seller’s identity, payout destination, and provider approval. Those cannot be fabricated or delegated to code. The site, product, sample report, and test-mode integration can be completed first; live payment acceptance becomes the first explicit external-account gate.

The current Vercel Hobby deployment is for pre-payment validation only. Before enabling any checkout URL, upgrade it to a plan that permits commercial use or move the static site to a commercial-compatible host, then re-run production verification. Hosting-plan acceptance and any charge require the seller's action-time approval.
