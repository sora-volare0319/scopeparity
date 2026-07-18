# Revenue model — path to ¥1,000,000

Last reviewed: 2026-07-18

## Revenue equation

The launch product is a project-scoped evidence-production workspace, not a paywall on diagnostic findings or a low-priced subscription.

| Offer | Price | Included outcome |
| --- | ---: | --- |
| Free local scan | ¥0 | All deterministic findings, scope/source inventory, optional public-surface checks, HTML/JSON diagnostic report, no account |
| Launch Evidence Workspace | ¥59,800 / $399 | Local pack compiler, scope-evidence matrix, recording runbook and storyboard workspace, provenance record, read-only CI workflow, one project, permanent use of the purchased release |

Target: 20 Launch Evidence Workspace sales × ¥59,800 = ¥1,196,000 gross revenue. Seventeen sales cross ¥1,000,000 gross; twenty provide room for refunds and payment fees.

Revenue is counted only after settled payment. Reservations, taxes collected, refunded payments, and unpaid invoices are excluded from the ¥1,000,000 goal.

## Initial customer

Prioritize teams that have all of the following:

- a public, external Google OAuth app approaching launch or re-verification;
- one or more sensitive but not restricted Google scopes;
- a working product and source repository;
- a founder or developer who owns the submission;
- a visible schedule cost if launch is delayed;
- willingness to run a local CLI and paste non-secret consent-screen values.

Do not target internal-only apps, hobby projects under the user cap, projects that only need basic sign-in scopes, restricted-scope projects, or non-technical buyers seeking a done-for-you approval service.

## Acquisition loop

1. A developer searches an exact warning, rejection phrase, or scope mismatch.
2. A focused technical page explains the mechanical cause and offers one command.
3. The free CLI returns useful findings locally before asking for payment.
4. A sample workspace shows the execution work that the paid compiler removes after diagnosis.
5. Self-serve checkout delivers the version-fixed local workspace compiler. The purchased release remains licensed for the named project; future releases are separate unless checkout explicitly includes them.
6. The generated read-only workflow keeps scope drift visible when the repository changes.

No cold-call motion is required. Early founder time is reserved for writing evidence-based pages, answering public technical questions without pitching, and improving the scanner from observed failures.

## Traffic and conversion model

The working model is intentionally explicit:

| Funnel step | Assumption | Required for 20 sales |
| --- | ---: | ---: |
| High-intent visits | 100% | 667 |
| Completed free scan | 15% | 100 |
| Paid conversion from visit | 3% | 20 |
| Paid conversion from completed scan | 20% | 20 |

These are hypotheses, not forecasts. Instrument actual visits, command-copy events, completed scans, report views, checkout starts, settled purchases, refunds, and the source/rejection phrase that brought the buyer.

## Distribution assets

- npm CLI and copyable `npx` command;
- GitHub repository with fixture-based proof and a sample report;
- GitHub Action after the standalone CLI is stable;
- pages for exact failure strings and high-intent tasks;
- a free browser-based manifest builder that exports locally and never receives source code;
- sample evidence workspaces for Calendar, Drive, and Gmail-sensitive-scope scenarios;
- comparison pages that explain when Google verification is not required, so unqualified visitors self-select out.

## Unit-economics guardrails

- Keep cloud inference cost at zero; the scanner is deterministic and local.
- Keep per-customer manual delivery below 20 minutes.
- Do not include calls in the base offer.
- Refund when the tool cannot scan a documented supported stack, not when Google makes a human policy decision.
- Do not start paid acquisition until one organic cohort converts at 3% or better.

## Stage gates

1. **Technical proof:** fixture accuracy and secret-boundary tests pass.
2. **Message proof:** 100 qualified visits produce 10 scans.
3. **Payment proof:** three settled ¥59,800 purchases within 14 days of a live commercial checkout.
4. **Retention proof:** five settled purchases with less than 10% refunds.
5. **Scale:** expand exact-intent content and integrations only after stage 4.
