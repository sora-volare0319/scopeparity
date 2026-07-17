import type { RevenueEventRecord, RevenueEventStore } from "./types.js";

function logicalEventKey(event: RevenueEventRecord): string {
  return JSON.stringify([event.provider, event.environment, event.endpointKey, event.providerEventId]);
}

function exactEventKey(event: RevenueEventRecord): string {
  return JSON.stringify([logicalEventKey(event), event.payloadSha256]);
}

export class InMemoryRevenueEventStore implements RevenueEventStore {
  readonly #events = new Map<string, RevenueEventRecord>();
  readonly #claims = new Map<string, string>();

  async appendIfAbsent(event: RevenueEventRecord): Promise<"inserted" | "duplicate" | "conflict"> {
    const logicalKey = logicalEventKey(event);
    const exactKey = exactEventKey(event);
    const claimedHash = this.#claims.get(logicalKey);
    if (claimedHash !== undefined && claimedHash !== event.payloadSha256) {
      if (!this.#events.has(exactKey)) {
        this.#events.set(exactKey, structuredClone(event));
      }
      return "conflict";
    }
    if (this.#events.has(exactKey)) {
      return "duplicate";
    }
    this.#events.set(exactKey, structuredClone(event));
    if (claimedHash === undefined) {
      this.#claims.set(logicalKey, event.payloadSha256);
      return "inserted";
    }
    return "inserted";
  }

  all(): RevenueEventRecord[] {
    return [...this.#events.values()].map((event) => structuredClone(event));
  }
}

export interface PostgresQueryResult {
  rowCount: number | null;
  rows: Array<Record<string, unknown>>;
}

export interface PostgresQueryClient {
  query(sql: string, values: unknown[]): Promise<PostgresQueryResult>;
}

/** Adapter for pg-compatible clients. The migration supplies the atomic unique key. */
export class PostgresRevenueEventStore implements RevenueEventStore {
  constructor(private readonly client: PostgresQueryClient) {}

  async appendIfAbsent(event: RevenueEventRecord): Promise<"inserted" | "duplicate" | "conflict"> {
    const result = await this.client.query(
      `WITH claim AS (
        INSERT INTO scopeparity_revenue_event_claims (
          provider, provider_environment, endpoint_key, provider_event_id, first_payload_sha256
        ) VALUES ($2, $3, $4, $5, $6)
        ON CONFLICT (provider, provider_environment, endpoint_key, provider_event_id)
        DO UPDATE SET first_payload_sha256 = scopeparity_revenue_event_claims.first_payload_sha256
        RETURNING first_payload_sha256
      ), inserted AS (
        INSERT INTO scopeparity_revenue_events (
          schema_version, provider, provider_environment, endpoint_key, provider_event_id,
          payload_sha256, event_type, occurred_at, order_id, organization_id, product_id,
          product_kind, eligibility, currency, subtotal_amount_minor, discount_amount_minor,
          gross_amount_minor, tax_amount_minor, refunded_amount_minor, refunded_tax_amount_minor,
          acquisition_source
        ) SELECT
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
          $17, $18, $19, $20, $21
        FROM claim
        ON CONFLICT (provider, provider_environment, endpoint_key, provider_event_id, payload_sha256)
        DO NOTHING
        RETURNING 1
      )
      SELECT CASE
        WHEN (SELECT first_payload_sha256 FROM claim) <> $6 THEN 'conflict'
        WHEN EXISTS (SELECT 1 FROM inserted) THEN 'inserted'
        ELSE 'duplicate'
      END AS outcome`,
      [
        event.schemaVersion,
        event.provider,
        event.environment,
        event.endpointKey,
        event.providerEventId,
        event.payloadSha256,
        event.eventType,
        event.occurredAt,
        event.orderId,
        event.organizationId,
        event.providerProductId,
        event.product,
        event.eligibility,
        event.currency,
        event.subtotalAmountMinor,
        event.discountAmountMinor,
        event.grossAmountMinor,
        event.taxAmountMinor,
        event.refundedAmountMinor,
        event.refundedTaxAmountMinor,
        event.acquisitionSource ?? null,
      ],
    );
    const outcome = result.rows[0]?.outcome;
    if (outcome !== "inserted" && outcome !== "duplicate" && outcome !== "conflict") {
      throw new Error("Postgres did not return a revenue event outcome");
    }
    return outcome;
  }
}
