# ScopeParity revenue ledger

This private workspace package turns verified Polar order webhooks into a
PII-free, append-only revenue event stream and derives progress toward the
¥1,000,000 goal.

It does not open checkout, create products, call an FX service, or treat a
client-side success page as payment proof.

## Provider contract

Configure a dedicated Polar endpoint for only:

- `order.paid`
- `order.refunded`

Pass the unparsed request body, all `webhook-*` headers, the endpoint's raw
secret, environment, endpoint key, organization ID, and exact product rules to
`ingestPolarWebhook`. The official `@polar-sh/sdk@0.48.1` performs Standard
Webhooks verification before any snapshot is returned.

The store's `appendIfAbsent` operation claims the logical provider identity:

```text
(provider, provider_environment, endpoint_key, provider_event_id)
```

An exact replay of the first claimed `payloadSha256` is a duplicate. The same
logical identity with a different hash is stored as a conflict and returns
`202 accepted_conflict`; all orders touched by either payload fail closed in the
ledger. The server adapter must alert on that outcome using only the safe event
and order IDs. It must not return repeated non-2xx responses for a conflict that
is already durable, because Polar can disable an endpoint after repeated failed
deliveries.

Use `sql/001_revenue_events.sql` with a migration role. Give the webhook runtime
only the minimum event-insert and logical-claim upsert privileges required by
the checked-in query; do not give it event update/delete, migration, or FX-rate
administration privileges.

## Revenue rule

For an eligible production Launch Evidence Workspace order:

```text
recognized native revenue = Polar netAmount - cumulative refundedAmount
```

Both fields exclude tax. Sandbox orders, reservations, unknown products,
recurring orders, zero-value orders, inconsistent snapshots, and missing FX
rates do not contribute to the goal.

JPY is counted directly. Other currencies require an explicit purchase-date
rate represented as an integer ratio of JPY minor units per source minor unit.
The same purchase-date rate reverses later cumulative refunds, so a full refund
returns the order to exactly zero rather than creating an FX gain or loss.

## Data boundary

Persisted rows include opaque provider/order/product IDs, allowlisted financial
fields, a bounded acquisition-source token, and a SHA-256 body fingerprint.
They do not include the raw body, signature, headers, customer ID, checkout ID,
name, email, address, tax ID, product display name, or arbitrary metadata.

## Deployment gate

Do not expose a production route until all of these exist:

1. separate sandbox and production endpoints, secrets, and product IDs;
2. a durable Postgres-compatible database with the migration applied;
3. a server-only adapter that returns the package's status without logging the
   body or parsed event;
4. sandbox paid, replay, partial-refund, full-refund, tamper, and database-outage
   tests; and
5. a commercial-compatible host and completed seller/Merchant-of-Record setup.

An ephemeral function filesystem is not a revenue ledger.
