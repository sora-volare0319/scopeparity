# Measurement plan

Last reviewed: 2026-07-18

## Decision contract

ScopeParity measures only the actions needed to decide whether distribution,
activation, offer, or checkout is the current bottleneck. Page content, command
text, repository data, URLs entered by visitors, GitHub identities, and other
personal data are never attached to client-side events.

Vercel Web Analytics provides aggregate route and referrer measurement.
`apps/site/src/AnalyticsEvents.tsx` turns only explicitly allowlisted
`data-event` attributes into custom events. The CLI remains telemetry-free.

## Website events

| Event | Trigger | Funnel meaning | Decision enabled |
| --- | --- | --- | --- |
| `header_cli_anchor` | Header local-run link clicked | Early free-tool intent | Keep or remove persistent header CTA |
| `hero_init_copy` | Hero initialize command copied successfully | Free activation begins | Diagnose hero-to-command friction |
| `hero_scan_copy` | Hero scan command copied successfully | Stronger free activation intent | Compare manifest setup versus scan intent |
| `hero_gh_extension_click` | GitHub CLI extension link clicked from the hero quickstart | Alternative-install exploration | Keep the extension visible only if the GitHub CLI path is used |
| `footer_init_copy` | Footer initialize command copied successfully | Late-page activation | Compare proof-led versus immediate activation |
| `footer_scan_copy` | Footer scan command copied successfully | Late-page stronger activation | Compare proof-led versus immediate activation |
| `hero_sample_report_click` | Hero sample-report link clicked | Proof sought before activation | Prioritize report proof versus more copy |
| `sample_public_examples_click` | Reproducible examples opened | Engine-level proof sought | Expand fixtures only when this path is used |
| `pricing_free_scan_click` | Free row CTA clicked | Pricing-page visitor chooses free activation | Preserve the free-to-paid bridge |
| `workspace_interest_click` | Public purchase-interest form opened | Low-signal offer exploration before checkout exists | Measure whether visitors inspect the priced-interest path; a submitted valid issue is still required for purchase-intent evidence |
| `evidence_checkout_click` | Configured workspace checkout link clicked | Checkout handoff attempt | Compare site handoffs with provider-recorded checkout starts before changing the offer |

Preview checkout clicks and failed clipboard writes emit no purchase or
activation event. Unknown or dynamically injected event names are ignored.
Click text, page content, command text, and DOM content are not sent as event
properties.

## Source of truth by stage

| Stage | Evidence | What it does not prove |
| --- | --- | --- |
| Qualified visit | Aggregate route/referrer analytics after bot and internal-QA review | A scan or purchase intent |
| On-site activation intent | Successful command-copy custom event | That the command completed locally |
| Conservative completed-scan lower bound | Valid `scan-feedback` issue from a distinct GitHub author | Total completed scans or visit-to-scan conversion |
| Purchase intent | Valid `workspace-interest` issue or hosted-checkout start | A completed sale |
| Revenue | Verified production `order.paid` less cumulative settled refunds | Cash payout timing or future retained revenue |

Browser redirects, thank-you pages, test-mode orders, unpaid invoices, and tax
are excluded from the ¥1,000,000 goal total. Refund events remain in the
append-only ledger, and cumulative settled refunds reduce recognized revenue.

## Launch decisions

Use qualified sessions rather than impressions, and exclude internal
verification traffic where the provider permits.

### First 24 hours

- Zero qualified external sessions: distribution failed; change channel or post
  framing before changing the product.
- Qualified sessions but zero proof interactions: the landing promise or
  audience match failed; inspect route/referrer segments.

### First 7 days

- At least 50 qualified sessions and fewer than 3 command-copy events: revise
  the hero-to-command transition.
- At least 10 distinct command-copy events and no valid scan feedback: improve
  first-run completion and the opt-in feedback prompt.
- At least 5 valid completed-scan signals and no priced interest: test offer
  framing, deliverable proof, and price anchoring before adding scanner rules.
- A valid submitted purchase-interest issue with checkout still off: seller
  onboarding and commercial hosting become the highest-priority gate.
- Checkout starts without settled purchases: inspect provider-side abandonment
  and product-page-to-checkout expectation mismatch; do not count starts as
  revenue.

These are decision thresholds for the first launch cohort, not forecasts or
customer claims.
