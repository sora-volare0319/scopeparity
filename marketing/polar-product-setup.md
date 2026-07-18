# Polar product setup — Launch Evidence Workspace

Last reviewed: 2026-07-18

This is the copy-and-configuration sheet for the first commercial product. It
does not replace the seller's identity, refund, or contractual approvals.

## Product record

| Field | Value |
| --- | --- |
| Product name | ScopeParity Launch Evidence Workspace |
| Billing model | One-time purchase |
| JPY price | ¥59,800 |
| USD price | $399 |
| Product type | Downloadable developer software and project template |
| License unit | One purchaser, one named software project |
| Delivery | Polar File Downloads benefit |
| Buyer archive | `scopeparity-launch-evidence-workspace-0.1.3.tgz` |
| SHA-256 | `afc928b2c8c76543fe12654b7590160106fa676f791a191070930e0a2b8e0d60` |
| Success URL | `https://scopeparity.vercel.app/?purchase=complete#pricing` |
| Cancel/back URL | `https://scopeparity.vercel.app/#pricing` |

Use Polar Starter for initial validation. Re-evaluate Polar Pro before a month
expected to contain four or more $399-equivalent purchases. The public product
page must run on Vercel Pro or another commercial-compatible host before the
checkout URL is enabled. See Polar's current
[pricing](https://polar.sh/resources/pricing), Vercel's
[fair-use boundary](https://vercel.com/docs/limits/fair-use-guidelines), and the
[Vercel Pro plan](https://vercel.com/docs/plans/pro-plan) before activation.

## Short description

Compile a local Google OAuth launch-evidence workspace from the matching free
ScopeParity JSON report and secret-free manifest. The download creates a
scope-to-feature matrix, recording runbook, storyboard, public-surface evidence
summary, provenance record, and read-only CI template for one named project.

## Checkout description

One-time purchase for one named software project. The compiler runs locally,
uses no Google credentials, performs no source upload, and has no online license
check. The purchased release may be used permanently for the licensed project;
future releases are separate unless this checkout explicitly says otherwise.

ScopeParity finds bounded technical inconsistencies. It does not guarantee
Google approval, provide legal or policy advice, assess restricted scopes,
submit an application, or include calls and done-for-you review.

## File Downloads benefit

1. Attach `scopeparity-launch-evidence-workspace-0.1.3.tgz` from the private
   `v0.1.3` release.
2. Confirm Polar shows the exact SHA-256 value from the product record above.
3. Keep the archive private; do not grant buyers access to the private source
   repository for the initial offer.
4. Complete one 100%-discount or sandbox checkout and download the file through
   the buyer portal before enabling the production link.
5. Refund the test order if production money was used. Never count the test in
   the revenue ledger.

Polar documents per-buyer signed download URLs, SHA-256 display, and
retrospective access to later files in its
[File Downloads guide](https://polar.sh/docs/features/benefits/file-downloads).
Its [refund guide](https://polar.sh/docs/features/refunds) documents benefit
revocation for one-time purchases.

## Support boundary

Public support email: **OWNER MUST SUPPLY A REAL MONITORED ADDRESS**

Suggested checkout text:

> Support covers reproducible product defects in the purchased release. Initial
> response target: within 48 hours. Google review correspondence, policy or legal
> interpretation, restricted-scope assessment, implementation consulting, and
> submission work are not included.

The owner must confirm the support address and response commitment before
account review. Polar's account-review guidance expects merchants to handle
forwarded customer inquiries promptly:
<https://polar.sh/docs/merchant-of-record/account-reviews>.

## Owner-only fields

Do not enable production checkout until the owner has personally supplied and
approved all of the following:

- legal seller name and business address;
- monitored support email and public seller contact details;
- refund policy and any jurisdiction-specific disclosures;
- Polar terms and acceptable-use acceptance;
- government ID, selfie, Stripe Connect Express payout account, and bank details;
- Vercel Pro purchase and plan terms;
- the final hosted-checkout preview.

No code or agent may infer these values.

## Activation checklist

- [ ] Polar account review and payout setup are complete.
- [ ] One-time product has JPY and USD prices.
- [ ] File Downloads delivers the v0.1.3 archive and checksum.
- [ ] Seller, support, refund, and product-boundary text are visible before pay.
- [ ] A sandbox or 100%-discount end-to-end download succeeds.
- [ ] Vercel is on a commercial-compatible plan.
- [ ] `VITE_EVIDENCE_CHECKOUT_URL` points to the reviewed production checkout.
- [ ] Production build and desktop/mobile checkout handoff are verified.
- [ ] The production webhook remains disabled until its separate security gate,
      database, and sandbox replay/refund tests are complete.

The webhook is useful for the append-only revenue ledger, but Polar File
Downloads—not the webhook—is the delivery path. A webhook outage must never
withhold the purchased archive.
