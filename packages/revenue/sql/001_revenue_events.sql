-- Apply with a migration role. Keep schema changes and arbitrary updates away from the runtime role.
CREATE TABLE IF NOT EXISTS scopeparity_revenue_event_claims (
  provider text NOT NULL CHECK (provider = 'polar'),
  provider_environment text NOT NULL CHECK (provider_environment IN ('sandbox', 'production')),
  endpoint_key text NOT NULL,
  provider_event_id text NOT NULL,
  first_payload_sha256 text NOT NULL CHECK (first_payload_sha256 ~ '^[0-9a-f]{64}$'),
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (provider, provider_environment, endpoint_key, provider_event_id)
);

CREATE TABLE IF NOT EXISTS scopeparity_revenue_events (
  schema_version smallint NOT NULL CHECK (schema_version = 1),
  provider text NOT NULL CHECK (provider = 'polar'),
  provider_environment text NOT NULL CHECK (provider_environment IN ('sandbox', 'production')),
  endpoint_key text NOT NULL,
  provider_event_id text NOT NULL,
  payload_sha256 text NOT NULL CHECK (payload_sha256 ~ '^[0-9a-f]{64}$'),
  event_type text NOT NULL CHECK (event_type IN ('order.paid', 'order.refunded')),
  occurred_at timestamptz NOT NULL,
  order_id text NOT NULL,
  organization_id text,
  product_id text,
  product_kind text NOT NULL CHECK (product_kind IN ('reservation', 'evidence_workspace', 'drift_guard', 'unmapped')),
  eligibility text NOT NULL CHECK (eligibility IN (
    'eligible',
    'unmapped_product',
    'unexpected_organization',
    'unsupported_billing_reason',
    'recurring_order',
    'missing_product_snapshot',
    'recurring_product',
    'sku_mismatch',
    'unsupported_currency'
  )),
  currency text NOT NULL CHECK (currency = lower(currency)),
  subtotal_amount_minor bigint NOT NULL CHECK (subtotal_amount_minor >= 0),
  discount_amount_minor bigint NOT NULL CHECK (discount_amount_minor >= 0),
  gross_amount_minor bigint NOT NULL CHECK (gross_amount_minor >= 0),
  tax_amount_minor bigint NOT NULL CHECK (tax_amount_minor >= 0),
  refunded_amount_minor bigint NOT NULL CHECK (refunded_amount_minor >= 0),
  refunded_tax_amount_minor bigint NOT NULL CHECK (refunded_tax_amount_minor >= 0),
  acquisition_source text CHECK (acquisition_source ~ '^[a-z0-9][a-z0-9_-]{0,63}$'),
  received_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (provider, provider_environment, endpoint_key, provider_event_id, payload_sha256)
);

CREATE INDEX IF NOT EXISTS scopeparity_revenue_events_logical_event
  ON scopeparity_revenue_events (provider, provider_environment, endpoint_key, provider_event_id);

CREATE INDEX IF NOT EXISTS scopeparity_revenue_events_order_snapshot
  ON scopeparity_revenue_events (provider_environment, order_id, occurred_at DESC);

-- Native-currency audit only. JPY aggregation is performed with a documented,
-- purchase-date FX rate outside webhook ingestion; currencies are never added together here.
CREATE OR REPLACE VIEW scopeparity_goal_revenue_native AS
WITH conflicted_webhooks AS (
  SELECT provider, provider_environment, endpoint_key, provider_event_id
  FROM scopeparity_revenue_events
  GROUP BY provider, provider_environment, endpoint_key, provider_event_id
  HAVING count(DISTINCT payload_sha256) > 1
), conflict_free_events AS (
  SELECT event.*
  FROM scopeparity_revenue_events AS event
  WHERE NOT EXISTS (
    SELECT 1
    FROM conflicted_webhooks AS conflict
    WHERE conflict.provider = event.provider
      AND conflict.provider_environment = event.provider_environment
      AND conflict.endpoint_key = event.endpoint_key
      AND conflict.provider_event_id = event.provider_event_id
  )
), paid AS (
  SELECT
    provider_environment,
    order_id,
    min(product_id) AS product_id,
    min(currency) AS currency,
    min(gross_amount_minor) AS gross_amount_minor,
    min(occurred_at) AS occurred_at
  FROM conflict_free_events
  WHERE event_type = 'order.paid'
    AND provider_environment = 'production'
  GROUP BY provider_environment, order_id
  HAVING bool_and(product_kind = 'evidence_workspace')
    AND bool_and(eligibility = 'eligible')
    AND count(DISTINCT (product_id, currency, gross_amount_minor, tax_amount_minor)) = 1
), refunds AS (
  SELECT
    provider_environment,
    order_id,
    product_id,
    currency,
    max(refunded_amount_minor) AS refunded_amount_minor
  FROM conflict_free_events
  GROUP BY provider_environment, order_id, product_id, currency
)
SELECT
  paid.order_id,
  paid.currency,
  paid.occurred_at AS paid_at,
  paid.gross_amount_minor,
  least(paid.gross_amount_minor, coalesce(refunds.refunded_amount_minor, 0)) AS refunded_amount_minor,
  greatest(0, paid.gross_amount_minor - coalesce(refunds.refunded_amount_minor, 0)) AS recognized_amount_minor
FROM paid
LEFT JOIN refunds
  ON refunds.provider_environment = paid.provider_environment
  AND refunds.order_id = paid.order_id
  AND refunds.product_id IS NOT DISTINCT FROM paid.product_id
  AND refunds.currency = paid.currency;
