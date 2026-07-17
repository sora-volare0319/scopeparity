# Pricing — ScopeParity

Last updated: 2026-07-18

Sales status: checkout is not live. ScopeParity is not currently accepting payment, reservations, or purchaser data. The prices below describe the intended self-serve offers and do not create a purchase or reservation.

## Free local scan

- Price: ¥0
- Account required: No
- Delivery: Open-source CLI run inside the customer's Git repository
- Includes: Literal Google OAuth scope inventory, deterministic code-to-manifest findings, source paths and line numbers without source lines, HTML and JSON diagnostic reports, optional public HTTPS surface checks
- Data boundary: No source upload, Google credentials, telemetry, or model calls

Install and initialize:

```bash
npx -y github:sora-volare0319/scopeparity-cli#v0.1.3 init .
```

After filling in the generated secret-free manifest, run the local scan:

```bash
npx -y github:sora-volare0319/scopeparity-cli#v0.1.3 scan . --manifest oauth-evidence.yaml
```

## Founding validation reservation

- Intended price: ¥19,800
- Current availability: Not accepting payment
- Intended terms: Credited toward one Launch Evidence Workspace; a fixed automatic-refund date must be shown by the hosted checkout before payment
- Eligibility: Public external apps using sensitive, non-restricted Google OAuth scopes
- Revenue treatment: A reservation is not counted toward ScopeParity's ¥1,000,000 settled-revenue goal

## Launch Evidence Workspace

- Intended price: ¥59,800 or US$399, one-time
- Current availability: Not accepting payment
- License scope: One named project; permanent use of the purchased release
- Includes: Local evidence compiler, scope-evidence matrix in CSV and JSON, recording runbook, local storyboard workspace, provenance record, and read-only CI workflow
- Updates: Future releases are separate unless a hosted checkout explicitly says otherwise
- Delivery: Version-fixed downloadable package through a hosted Merchant of Record after checkout is enabled

## Not included

- Google approval, certification, compliance scoring, policy advice, or legal advice
- Restricted-scope security assessment
- Google Cloud credentials or console access
- Calls, human onboarding, or a done-for-you submission

## Qualification boundary

ScopeParity is designed for developers preparing or changing a public Google OAuth app with sensitive, non-restricted scopes. It is usually not useful for internal-only apps, personal testing, basic sign-in scopes, or projects that require a restricted-scope security assessment.

Product: https://scopeparity.vercel.app/

Source and issue-based purchase-interest signal: https://github.com/sora-volare0319/scopeparity
