# Validation matrix

Last reviewed: 2026-07-18

## Release bar

ScopeParity may be publicly distributed only when all safety tests pass and no fixture with an objective critical mismatch receives a clean status. Demand testing can begin with a clearly labelled preview, but paid full-price delivery cannot.

## Seeded acceptance cases

| ID | Scenario | Expected result |
| --- | --- | --- |
| F01 | Calendar scope in TypeScript and manifest | Complete evidence, no scope drift |
| F02 | Runtime Calendar scope absent from manifest | `SCOPE_IN_CODE_NOT_DECLARED` blocker |
| F03 | Manifest Gmail scope absent from source | `DECLARED_SCOPE_NOT_FOUND_IN_CODE` blocker |
| F04 | Scope appears in Python list | Scope and relative line location detected |
| F05 | Scope appears in JSON configuration | Scope and relative line location detected |
| F06 | Same scope appears in multiple files | One normalized scope with all safe locations |
| F07 | Scope text exists only in `.env` | File is never read or reported |
| F08 | Scope text exists in an untracked source file | File is never read or reported |
| F09 | Tracked symlink points outside repository | Target is never read; safety notice emitted |
| F10 | Binary contains a scope-like byte sequence | File is never read or reported |
| F11 | Manifest contains a known restricted scope | Scan stops at external-assessment boundary |
| F12 | Redirect host is absent from authorized domains | `REDIRECT_HOST_NOT_AUTHORIZED` blocker |
| F13 | Homepage host is absent from authorized domains | `HOMEPAGE_DOMAIN_NOT_DECLARED` blocker |
| F14 | Privacy-policy host differs from homepage host | `PRIVACY_DOMAIN_MISMATCH` blocker |
| F15 | Scope has no mapped feature | `SCOPE_WITHOUT_FEATURE_EVIDENCE` blocker |
| F16 | Scope feature has no recording step | `VIDEO_STEP_MISSING_FOR_SCOPE` blocker |
| F17 | Homepage omits a link to declared privacy URL | public-check finding, only when opt-in URL check runs |
| F18 | Homepage omits the declared app name | public-check finding, only when opt-in URL check runs |
| F19 | Public URL resolves to loopback/private IP | Request is rejected before connection |
| F20 | Public URL redirects to metadata/private address | Every redirect is rejected before connection |

## Test layers

### Unit

- manifest parsing and precise validation errors;
- scope normalization, deduplication, and source locations;
- domain normalization and subdomain handling;
- rule severity, category, remediation, and official reference;
- HTML escaping and report determinism.

### Integration

- real temporary Git repositories for tracked/untracked/symlink cases;
- CLI exit codes and output modes;
- JSON output schema and self-contained HTML generation;
- no source line, secret value, absolute user path, or environment value in reports.

### Browser

- keyboard navigation and visible focus;
- mobile and desktop layouts;
- reduced-motion behavior;
- interactive sample findings and disclosure copy;
- checkout links and event payloads without sensitive data.

### Security

- command arguments are passed as arrays, never shell-concatenated;
- malicious filenames cannot inject terminal control sequences or HTML;
- YAML aliases/oversized inputs are bounded;
- report data is escaped before insertion;
- public URL checks block loopback, RFC1918, link-local, unique-local IPv6, metadata hosts, encoded-IP forms, DNS rebinding, and unsafe redirects;
- generated CI permissions are read-only and never use `pull_request_target`.

### Revenue integrity

- Polar signatures are checked against the raw body before parsing or persistence;
- invalid signatures and inconsistent financial snapshots write zero rows;
- `(environment, endpoint, webhook-id)` retries are deduplicated only when their body hash matches; mismatched hashes are retained as conflicts and excluded from revenue;
- a durably stored conflict is acknowledged and alerted rather than retried until the provider disables the endpoint;
- `order.refunded` uses the cumulative refund snapshot rather than additive event deltas;
- refund-before-paid, repeated partial refund, and full refund sequences never inflate revenue;
- sandbox, reservation, unknown-product, recurring, and zero-value orders are excluded;
- JPY and USD minor units are never added directly, and missing FX fails closed;
- raw payloads, signatures, names, email, addresses, tax IDs, and arbitrary metadata are not persisted; and
- storage failure produces a non-2xx retryable result.

## Accuracy scorecard

Track four values separately:

- objective blocker recall across F01–F20;
- objective blocker precision;
- critical misses, which must remain zero;
- manual observations incorrectly presented as blockers, which must remain zero.

A single blended “readiness score” is prohibited because it would hide the difference between machine-checkable inconsistency and human policy judgment.
