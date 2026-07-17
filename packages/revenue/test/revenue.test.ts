import { randomUUID } from "node:crypto";

import { Webhook } from "standardwebhooks";
import { describe, expect, it } from "vitest";

import { buildRevenueLedger } from "../src/ledger.js";
import { ingestPolarWebhook } from "../src/polar.js";
import { InMemoryRevenueEventStore, PostgresRevenueEventStore } from "../src/store.js";
import type { PolarWebhookConfig, RevenueEventRecord, RevenueEventStore } from "../src/types.js";

const ORGANIZATION_ID = "426dc06b-32b0-4ed5-90ff-d5f58a44dca0";
const EVIDENCE_PRODUCT_ID = "ae2f80e4-33fd-4e5d-ab6d-704de6bb60d3";
const RESERVATION_PRODUCT_ID = "d4e8d3df-48d8-4ae9-aa57-37f3cb2ba631";
const CUSTOMER_ID = "943f747f-85c6-471f-98b3-0a1c734e3802";
const CHECKOUT_ID = "e6a10c56-6e69-49f9-9764-b3577140a532";
const WEBHOOK_SECRET = "scopeparity-test-secret";

const PRODUCT_RULES = [
  {
    productId: EVIDENCE_PRODUCT_ID,
    product: "evidence_workspace" as const,
    sku: "launch-evidence-workspace",
    allowedCurrencies: ["jpy", "usd"],
  },
  {
    productId: RESERVATION_PRODUCT_ID,
    product: "reservation" as const,
    sku: "validation-reservation",
    allowedCurrencies: ["jpy"],
  },
];

function config(environment: "sandbox" | "production" = "production"): PolarWebhookConfig {
  return {
    environment,
    endpointKey: `polar-${environment}-orders-v1`,
    webhookSecret: WEBHOOK_SECRET,
    organizationId: ORGANIZATION_ID,
    products: PRODUCT_RULES,
  };
}

interface OrderOverrides {
  id?: string;
  status?: string;
  productId?: string;
  sku?: string;
  currency?: string;
  netAmount?: number;
  taxAmount?: number;
  totalAmount?: number;
  refundedAmount?: number;
  refundedTaxAmount?: number;
  billingReason?: string;
  subscriptionId?: string | null;
  isRecurring?: boolean;
  organizationId?: string;
  productMissing?: boolean;
  acquisitionSource?: string;
}

function orderPayload(overrides: OrderOverrides = {}) {
  const id = overrides.id ?? randomUUID();
  const productId = overrides.productId ?? EVIDENCE_PRODUCT_ID;
  const sku = overrides.sku ?? (productId === RESERVATION_PRODUCT_ID ? "validation-reservation" : "launch-evidence-workspace");
  const netAmount = overrides.netAmount ?? 59_800;
  const taxAmount = overrides.taxAmount ?? 5_980;
  const refundedAmount = overrides.refundedAmount ?? 0;
  const refundedTaxAmount = overrides.refundedTaxAmount ?? 0;
  const now = "2026-07-18T09:00:00.000Z";
  return {
    id,
    created_at: now,
    modified_at: now,
    status: overrides.status ?? (refundedAmount > 0 ? "partially_refunded" : "paid"),
    paid: true,
    subtotal_amount: netAmount,
    discount_amount: 0,
    net_amount: netAmount,
    tax_amount: taxAmount,
    total_amount: overrides.totalAmount ?? netAmount + taxAmount,
    applied_balance_amount: 0,
    due_amount: 0,
    refunded_amount: refundedAmount,
    refunded_tax_amount: refundedTaxAmount,
    currency: overrides.currency ?? "jpy",
    billing_reason: overrides.billingReason ?? "purchase",
    billing_name: "Private Buyer Name",
    billing_address: {
      country: "JP",
      line1: "Private address",
      line2: null,
      postal_code: "100-0001",
      city: "Tokyo",
      state: "Tokyo",
    },
    invoice_number: null,
    is_invoice_generated: false,
    receipt_number: "RCPT-TEST-0001",
    seats: null,
    customer_id: CUSTOMER_ID,
    product_id: productId,
    discount_id: null,
    subscription_id: overrides.subscriptionId ?? null,
    checkout_id: CHECKOUT_ID,
    metadata: {
      scopeparity_acquisition_source: overrides.acquisitionSource ?? "oauth_scope_justification",
      private_note: "must not persist",
    },
    custom_field_data: {},
    platform_fee_amount: 3_490,
    platform_fee_currency: overrides.currency ?? "jpy",
    customer: {
      id: CUSTOMER_ID,
      created_at: now,
      modified_at: null,
      metadata: { private_segment: "must not persist" },
      external_id: null,
      email: "buyer@example.test",
      email_verified: true,
      type: "individual",
      name: "Private Buyer Name",
      billing_address: null,
      tax_id: null,
      locale: "ja",
      organization_id: ORGANIZATION_ID,
      default_payment_method_id: null,
      deleted_at: null,
      avatar_url: "",
    },
    product: overrides.productMissing ? null : {
      metadata: { scopeparity_sku: sku },
      id: productId,
      created_at: now,
      modified_at: null,
      trial_interval: null,
      trial_interval_count: null,
      name: "Private product display name",
      description: null,
      visibility: "public",
      recurring_interval: overrides.isRecurring ? "month" : null,
      recurring_interval_count: overrides.isRecurring ? 1 : null,
      is_recurring: overrides.isRecurring ?? false,
      is_archived: false,
      organization_id: overrides.organizationId ?? ORGANIZATION_ID,
    },
    discount: null,
    subscription: null,
    items: [],
    description: "ScopeParity order",
    refundable_amount: Math.max(0, netAmount - refundedAmount),
    refundable_tax_amount: Math.max(0, taxAmount - refundedTaxAmount),
  };
}

function signedWebhook(
  eventType: "order.created" | "order.paid" | "order.refunded",
  order: ReturnType<typeof orderPayload>,
  options: { providerEventId?: string; occurredAt?: string; secret?: string } = {},
) {
  const occurredAt = options.occurredAt ?? "2026-07-18T09:00:00.000Z";
  const providerEventId = options.providerEventId ?? `msg_${randomUUID()}`;
  const rawBody = JSON.stringify({ type: eventType, timestamp: occurredAt, data: order });
  const signedAt = new Date();
  const secret = options.secret ?? WEBHOOK_SECRET;
  const signature = new Webhook(Buffer.from(secret, "utf8").toString("base64")).sign(
    providerEventId,
    signedAt,
    rawBody,
  );
  return {
    rawBody,
    headers: {
      "webhook-id": providerEventId,
      "webhook-timestamp": Math.floor(signedAt.getTime() / 1000).toString(),
      "webhook-signature": signature,
    },
  };
}

async function ingest(
  store: InMemoryRevenueEventStore,
  eventType: "order.created" | "order.paid" | "order.refunded",
  order: ReturnType<typeof orderPayload>,
  options: { providerEventId?: string; occurredAt?: string; environment?: "sandbox" | "production" } = {},
) {
  return ingestPolarWebhook(
    signedWebhook(eventType, order, options),
    config(options.environment),
    store,
  );
}

describe("Polar webhook ingestion", () => {
  it("verifies a paid event and persists only allowlisted, PII-free fields", async () => {
    const store = new InMemoryRevenueEventStore();
    const result = await ingest(store, "order.paid", orderPayload());

    expect(result).toMatchObject({ httpStatus: 202, outcome: "accepted" });
    const [record] = store.all();
    expect(record).toMatchObject({
      eventType: "order.paid",
      product: "evidence_workspace",
      eligibility: "eligible",
      grossAmountMinor: 59_800,
      taxAmountMinor: 5_980,
      acquisitionSource: "oauth_scope_justification",
    });
    expect(record?.payloadSha256).toMatch(/^[0-9a-f]{64}$/);
    const serialized = JSON.stringify(record);
    expect(serialized).not.toContain("buyer@example.test");
    expect(serialized).not.toContain("Private Buyer Name");
    expect(serialized).not.toContain("Private address");
    expect(serialized).not.toContain("private_note");
  });

  it("rejects an invalid signature without writing", async () => {
    const store = new InMemoryRevenueEventStore();
    const input = signedWebhook("order.paid", orderPayload(), { secret: "wrong-secret" });

    await expect(ingestPolarWebhook(input, config(), store)).resolves.toEqual({
      httpStatus: 403,
      outcome: "invalid_signature",
    });
    expect(store.all()).toHaveLength(0);
  });

  it("deduplicates a provider retry by environment, endpoint, and webhook ID", async () => {
    const store = new InMemoryRevenueEventStore();
    const order = orderPayload();
    const input = signedWebhook("order.paid", order, { providerEventId: "msg_retry" });

    const first = await ingestPolarWebhook(input, config(), store);
    const second = await ingestPolarWebhook(input, config(), store);

    expect(first.outcome).toBe("accepted");
    expect(second.outcome).toBe("duplicate");
    expect(store.all()).toHaveLength(1);
  });

  it("retains and rejects the same webhook ID when its signed body hash changes", async () => {
    const store = new InMemoryRevenueEventStore();
    const orderId = randomUUID();
    const providerEventId = "msg_conflicting_body";
    const paid = signedWebhook("order.paid", orderPayload({ id: orderId }), { providerEventId });
    const refunded = signedWebhook(
      "order.refunded",
      orderPayload({ id: orderId, status: "refunded", refundedAmount: 59_800, refundedTaxAmount: 5_980 }),
      { providerEventId, occurredAt: "2026-07-19T09:00:00.000Z" },
    );

    expect(await ingestPolarWebhook(paid, config(), store)).toMatchObject({ outcome: "accepted" });
    expect(await ingestPolarWebhook(refunded, config(), store)).toMatchObject({
      httpStatus: 202,
      outcome: "accepted_conflict",
    });
    expect(await ingestPolarWebhook(refunded, config(), store)).toMatchObject({
      httpStatus: 202,
      outcome: "accepted_conflict",
    });
    expect(store.all()).toHaveLength(2);
    const ledger = buildRevenueLedger(store.all());
    expect(ledger.recognizedGoalRevenueJpy).toBe(0);
    expect(ledger.orders[0]?.status).toBe("conflicting_snapshots");
  });

  it("returns a retryable failure when durable storage is unavailable", async () => {
    const failingStore: RevenueEventStore = {
      appendIfAbsent: async () => {
        throw new Error("database unavailable");
      },
    };

    await expect(
      ingestPolarWebhook(signedWebhook("order.paid", orderPayload()), config(), failingStore),
    ).resolves.toEqual({ httpStatus: 503, outcome: "storage_unavailable" });
  });

  it("validates then ignores an event outside the paid/refunded contract", async () => {
    const store = new InMemoryRevenueEventStore();
    const result = await ingest(store, "order.created", orderPayload());

    expect(result).toMatchObject({ httpStatus: 202, outcome: "ignored" });
    expect(store.all()).toHaveLength(0);
  });

  it("rejects internally inconsistent financial snapshots", async () => {
    const store = new InMemoryRevenueEventStore();
    const result = await ingest(
      store,
      "order.paid",
      orderPayload({ netAmount: 59_800, taxAmount: 5_980, totalAmount: 999 }),
    );

    expect(result).toEqual({ httpStatus: 422, outcome: "invalid_order_snapshot" });
    expect(store.all()).toHaveLength(0);
  });

  it("fails closed when server configuration is incomplete", async () => {
    const store = new InMemoryRevenueEventStore();
    const invalidConfig = { ...config(), webhookSecret: "" };

    await expect(
      ingestPolarWebhook(signedWebhook("order.paid", orderPayload()), invalidConfig, store),
    ).resolves.toEqual({ httpStatus: 503, outcome: "configuration_error" });
  });

  it("stores an unknown product as unmapped instead of counting it", async () => {
    const store = new InMemoryRevenueEventStore();
    await ingest(store, "order.paid", orderPayload({ productId: randomUUID(), sku: "unknown" }));

    expect(store.all()[0]).toMatchObject({ product: "unmapped", eligibility: "unmapped_product" });
    expect(buildRevenueLedger(store.all()).recognizedGoalRevenueJpy).toBe(0);
  });

  it.each([
    ["sku mismatch", { sku: "different-sku" }, "sku_mismatch"],
    ["recurring product", { isRecurring: true }, "recurring_product"],
    ["subscription billing", { billingReason: "subscription_cycle" }, "unsupported_billing_reason"],
    ["unsupported currency", { currency: "eur" }, "unsupported_currency"],
    ["unexpected organization", { organizationId: randomUUID() }, "unexpected_organization"],
    ["missing product snapshot", { productMissing: true }, "missing_product_snapshot"],
  ] as const)("fails closed for a mapped product with %s", async (_caseName, overrides, expectedEligibility) => {
    const store = new InMemoryRevenueEventStore();
    await ingest(store, "order.paid", orderPayload(overrides));

    expect(store.all()[0]?.eligibility).toBe(expectedEligibility);
    expect(buildRevenueLedger(store.all()).recognizedGoalRevenueJpy).toBe(0);
  });
});

describe("revenue ledger", () => {
  it("counts production JPY paid revenue and subtracts one cumulative partial refund", async () => {
    const store = new InMemoryRevenueEventStore();
    const orderId = randomUUID();
    const paid = orderPayload({ id: orderId });
    const refunded = orderPayload({ id: orderId, refundedAmount: 10_000, refundedTaxAmount: 1_000 });

    await ingest(store, "order.refunded", refunded, { occurredAt: "2026-07-19T09:00:00.000Z" });
    await ingest(store, "order.paid", paid, { occurredAt: "2026-07-18T09:00:00.000Z" });

    const ledger = buildRevenueLedger(store.all());
    expect(ledger.recognizedGoalRevenueJpy).toBe(49_800);
    expect(ledger.orders[0]).toMatchObject({
      status: "counted",
      grossAmountMinor: 59_800,
      refundedAmountMinor: 10_000,
      recognizedAmountMinor: 49_800,
    });
  });

  it("uses the largest cumulative refund snapshot rather than summing refund events", async () => {
    const store = new InMemoryRevenueEventStore();
    const orderId = randomUUID();
    await ingest(store, "order.paid", orderPayload({ id: orderId }), { occurredAt: "2026-07-18T09:00:00.000Z" });
    await ingest(store, "order.refunded", orderPayload({ id: orderId, refundedAmount: 10_000 }), {
      occurredAt: "2026-07-19T09:00:00.000Z",
    });
    await ingest(store, "order.refunded", orderPayload({ id: orderId, refundedAmount: 20_000 }), {
      occurredAt: "2026-07-20T09:00:00.000Z",
    });

    expect(buildRevenueLedger(store.all()).recognizedGoalRevenueJpy).toBe(39_800);
  });

  it("applies a refund snapshot even if the product was deleted after the paid event", async () => {
    const store = new InMemoryRevenueEventStore();
    const orderId = randomUUID();
    await ingest(store, "order.paid", orderPayload({ id: orderId }));
    await ingest(
      store,
      "order.refunded",
      orderPayload({ id: orderId, refundedAmount: 10_000, productMissing: true }),
      { occurredAt: "2026-07-19T09:00:00.000Z" },
    );

    expect(buildRevenueLedger(store.all()).recognizedGoalRevenueJpy).toBe(49_800);
  });

  it("does not count a refund snapshot until a verified paid event exists", async () => {
    const store = new InMemoryRevenueEventStore();
    await ingest(store, "order.refunded", orderPayload({ refundedAmount: 10_000 }));

    const ledger = buildRevenueLedger(store.all());
    expect(ledger.recognizedGoalRevenueJpy).toBe(0);
    expect(ledger.orders[0]?.status).toBe("no_paid_event");
  });

  it("removes a fully refunded order from goal revenue", async () => {
    const store = new InMemoryRevenueEventStore();
    const orderId = randomUUID();
    await ingest(store, "order.paid", orderPayload({ id: orderId }));
    await ingest(
      store,
      "order.refunded",
      orderPayload({ id: orderId, status: "refunded", refundedAmount: 59_800, refundedTaxAmount: 5_980 }),
      { occurredAt: "2026-07-19T09:00:00.000Z" },
    );

    const ledger = buildRevenueLedger(store.all());
    expect(ledger.recognizedGoalRevenueJpy).toBe(0);
    expect(ledger.orders[0]?.status).toBe("fully_refunded");
  });

  it("excludes sandbox orders and reservations", async () => {
    const sandboxStore = new InMemoryRevenueEventStore();
    await ingest(sandboxStore, "order.paid", orderPayload(), { environment: "sandbox" });
    const reservationStore = new InMemoryRevenueEventStore();
    await ingest(
      reservationStore,
      "order.paid",
      orderPayload({ productId: RESERVATION_PRODUCT_ID, netAmount: 19_800, taxAmount: 1_980 }),
    );

    expect(buildRevenueLedger(sandboxStore.all()).orders[0]?.status).toBe("sandbox");
    expect(buildRevenueLedger(reservationStore.all()).orders[0]?.status).toBe("product_not_goal");
  });

  it("does not silently convert USD and uses an exact documented purchase-date rate", async () => {
    const store = new InMemoryRevenueEventStore();
    await ingest(
      store,
      "order.paid",
      orderPayload({ currency: "usd", netAmount: 39_900, taxAmount: 0 }),
      { occurredAt: "2026-07-18T09:00:00.000Z" },
    );

    const missingRate = buildRevenueLedger(store.all());
    expect(missingRate.recognizedGoalRevenueJpy).toBe(0);
    expect(missingRate.orders[0]?.status).toBe("missing_fx_rate");
    expect(missingRate.missingFxOrderCount).toBe(1);

    const converted = buildRevenueLedger(store.all(), {
      fxRates: [
        {
          currency: "usd",
          rateDate: "2026-07-18",
          jpyMinorNumerator: 3,
          jpyMinorDenominator: 2,
          source: "documented-test-rate",
        },
      ],
    });
    expect(converted.recognizedGoalRevenueJpy).toBe(59_850);
    expect(converted.orders[0]).toMatchObject({
      status: "counted",
      goalRevenueJpy: 59_850,
      appliedFxRate: {
        currency: "usd",
        rateDate: "2026-07-18",
        jpyMinorNumerator: 3,
        jpyMinorDenominator: 2,
        source: "documented-test-rate",
      },
    });
  });

  it("recognizes a fully refunded USD order as zero without requiring FX", async () => {
    const store = new InMemoryRevenueEventStore();
    const orderId = randomUUID();
    await ingest(
      store,
      "order.paid",
      orderPayload({ id: orderId, currency: "usd", netAmount: 39_900, taxAmount: 0 }),
    );
    await ingest(
      store,
      "order.refunded",
      orderPayload({
        id: orderId,
        currency: "usd",
        netAmount: 39_900,
        taxAmount: 0,
        status: "refunded",
        refundedAmount: 39_900,
      }),
      { occurredAt: "2026-07-19T09:00:00.000Z" },
    );

    const ledger = buildRevenueLedger(store.all());
    expect(ledger.recognizedGoalRevenueJpy).toBe(0);
    expect(ledger.missingFxOrderCount).toBe(0);
    expect(ledger.orders[0]).toMatchObject({ status: "fully_refunded", goalRevenueJpy: 0 });
  });

  it("fails closed when two paid snapshots disagree on immutable facts", async () => {
    const store = new InMemoryRevenueEventStore();
    const orderId = randomUUID();
    await ingest(store, "order.paid", orderPayload({ id: orderId, netAmount: 59_800 }));
    await ingest(store, "order.paid", orderPayload({ id: orderId, netAmount: 50_000, taxAmount: 5_000 }), {
      occurredAt: "2026-07-19T09:00:00.000Z",
    });

    const ledger = buildRevenueLedger(store.all());
    expect(ledger.recognizedGoalRevenueJpy).toBe(0);
    expect(ledger.orders[0]?.status).toBe("conflicting_snapshots");
  });

  it("defensively deduplicates repeated stored event rows", async () => {
    const store = new InMemoryRevenueEventStore();
    await ingest(store, "order.paid", orderPayload());
    const event = store.all()[0] as RevenueEventRecord;

    const ledger = buildRevenueLedger([event, event]);
    expect(ledger.uniqueEventCount).toBe(1);
    expect(ledger.recognizedGoalRevenueJpy).toBe(59_800);
  });
});

describe("Postgres append contract", () => {
  it("uses an atomic insert with the full dedupe key and no raw payload", async () => {
    const calls: Array<{ sql: string; values: unknown[] }> = [];
    const client = {
      query: async (sql: string, values: unknown[]) => {
        calls.push({ sql, values });
        return { rowCount: 1, rows: [{ outcome: "inserted" }] };
      },
    };
    const memory = new InMemoryRevenueEventStore();
    await ingest(memory, "order.paid", orderPayload());
    const event = memory.all()[0] as RevenueEventRecord;

    await expect(new PostgresRevenueEventStore(client).appendIfAbsent(event)).resolves.toBe("inserted");
    expect(calls[0]?.sql).toContain("scopeparity_revenue_event_claims");
    expect(calls[0]?.sql).toContain(
      "ON CONFLICT (provider, provider_environment, endpoint_key, provider_event_id, payload_sha256)",
    );
    expect(calls[0]?.sql).not.toContain("raw_body");
    expect(JSON.stringify(calls[0]?.values)).not.toContain("buyer@example.test");
  });

  it("surfaces a Postgres logical-ID hash conflict", async () => {
    const client = {
      query: async () => ({ rowCount: 1, rows: [{ outcome: "conflict" }] }),
    };
    const memory = new InMemoryRevenueEventStore();
    await ingest(memory, "order.paid", orderPayload());
    const event = memory.all()[0] as RevenueEventRecord;

    await expect(new PostgresRevenueEventStore(client).appendIfAbsent(event)).resolves.toBe("conflict");
  });
});
