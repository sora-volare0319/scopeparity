import { createHash } from "node:crypto";

import { validateEvent, WebhookVerificationError } from "@polar-sh/sdk/webhooks";

import type {
  OrderEligibility,
  PolarProductRule,
  PolarWebhookConfig,
  RevenueEventRecord,
  RevenueEventStore,
  RevenueProduct,
} from "./types.js";
import { REVENUE_EVENT_SCHEMA_VERSION } from "./types.js";

export type WebhookHeaders = Readonly<Record<string, string | readonly string[] | undefined>>;

export interface PolarWebhookInput {
  rawBody: string | Buffer;
  headers: WebhookHeaders;
}

export type PolarWebhookResult =
  | {
      httpStatus: 202;
      outcome: "accepted" | "duplicate" | "accepted_conflict";
      providerEventId: string;
      orderId: string;
    }
  | { httpStatus: 202; outcome: "ignored"; providerEventId: string }
  | { httpStatus: 400; outcome: "invalid_payload" }
  | { httpStatus: 403; outcome: "invalid_signature" }
  | { httpStatus: 422; outcome: "invalid_order_snapshot" }
  | { httpStatus: 503; outcome: "configuration_error" | "storage_unavailable" };

class RevenueSnapshotError extends Error {}

function normalizeHeaders(headers: WebhookHeaders): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const [name, value] of Object.entries(headers)) {
    if (typeof value === "string") {
      normalized[name.toLowerCase()] = value;
      continue;
    }
    if (value?.length === 1 && value[0] !== undefined) {
      normalized[name.toLowerCase()] = value[0];
    }
  }
  return normalized;
}

function requiredHeader(headers: Record<string, string>, name: string): string {
  const value = headers[name]?.trim();
  if (!value || value.length > 255) {
    throw new WebhookVerificationError(`Missing or invalid ${name}`);
  }
  return value;
}

function assertConfiguration(config: PolarWebhookConfig): boolean {
  if (
    config.webhookSecret.trim().length === 0 ||
    config.endpointKey.trim().length === 0 ||
    config.organizationId.trim().length === 0 ||
    config.products.length === 0
  ) {
    return false;
  }

  const productIds = new Set<string>();
  for (const rule of config.products) {
    if (
      rule.productId.trim().length === 0 ||
      rule.sku.trim().length === 0 ||
      rule.allowedCurrencies.length === 0 ||
      productIds.has(rule.productId)
    ) {
      return false;
    }
    productIds.add(rule.productId);
  }
  return true;
}

function assertMinorAmount(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RevenueSnapshotError(`${field} must be a non-negative safe integer`);
  }
}

function classifyProduct(
  order: {
    billingReason: string;
    currency: string;
    productId: string | null;
    subscriptionId: string | null;
    product: {
      id: string;
      isRecurring: boolean;
      organizationId: string;
      metadata: Record<string, string | number | boolean>;
    } | null;
  },
  config: PolarWebhookConfig,
): { product: RevenueProduct; eligibility: OrderEligibility; rule: PolarProductRule | null } {
  const rule = config.products.find((candidate) => candidate.productId === order.productId) ?? null;
  if (rule === null) {
    return { product: "unmapped", eligibility: "unmapped_product", rule };
  }
  if (order.billingReason !== "purchase") {
    return { product: rule.product, eligibility: "unsupported_billing_reason", rule };
  }
  if (order.subscriptionId !== null) {
    return { product: rule.product, eligibility: "recurring_order", rule };
  }
  if (order.product === null) {
    return { product: rule.product, eligibility: "missing_product_snapshot", rule };
  }
  if (order.product.organizationId !== config.organizationId) {
    return { product: rule.product, eligibility: "unexpected_organization", rule };
  }
  if (order.product.id !== rule.productId || order.product.isRecurring) {
    return { product: rule.product, eligibility: "recurring_product", rule };
  }
  if (order.product.metadata.scopeparity_sku !== rule.sku) {
    return { product: rule.product, eligibility: "sku_mismatch", rule };
  }
  if (!rule.allowedCurrencies.includes(order.currency.toLowerCase())) {
    return { product: rule.product, eligibility: "unsupported_currency", rule };
  }
  return { product: rule.product, eligibility: "eligible", rule };
}

function extractAcquisitionSource(metadata: Record<string, string | number | boolean>, key: string): string | undefined {
  const value = metadata[key];
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  return /^[a-z0-9][a-z0-9_-]{0,63}$/.test(normalized) ? normalized : undefined;
}

export function verifyAndNormalizePolarWebhook(
  input: PolarWebhookInput,
  config: PolarWebhookConfig,
): RevenueEventRecord | null {
  const headers = normalizeHeaders(input.headers);
  const providerEventId = requiredHeader(headers, "webhook-id");
  requiredHeader(headers, "webhook-timestamp");
  requiredHeader(headers, "webhook-signature");

  const event = validateEvent(input.rawBody, headers, config.webhookSecret);
  if (event.type !== "order.paid" && event.type !== "order.refunded") {
    return null;
  }

  const order = event.data;
  assertMinorAmount(order.subtotalAmount, "subtotalAmount");
  assertMinorAmount(order.discountAmount, "discountAmount");
  assertMinorAmount(order.netAmount, "netAmount");
  assertMinorAmount(order.taxAmount, "taxAmount");
  assertMinorAmount(order.totalAmount, "totalAmount");
  assertMinorAmount(order.refundedAmount, "refundedAmount");
  assertMinorAmount(order.refundedTaxAmount, "refundedTaxAmount");
  if (!order.paid || order.totalAmount !== order.netAmount + order.taxAmount) {
    throw new RevenueSnapshotError("Paid order amounts are internally inconsistent");
  }
  if (order.refundedTaxAmount > order.taxAmount) {
    throw new RevenueSnapshotError("Refunded tax exceeds collected tax");
  }

  const currency = order.currency.toLowerCase();
  const classification = classifyProduct({ ...order, currency }, config);
  const metadataKey = config.acquisitionMetadataKey ?? "scopeparity_acquisition_source";
  const acquisitionSource = extractAcquisitionSource(order.metadata, metadataKey);
  const payloadSha256 = createHash("sha256").update(input.rawBody).digest("hex");

  return {
    schemaVersion: REVENUE_EVENT_SCHEMA_VERSION,
    provider: "polar",
    environment: config.environment,
    endpointKey: config.endpointKey,
    providerEventId,
    payloadSha256,
    eventType: event.type,
    occurredAt: event.timestamp.toISOString(),
    orderId: order.id,
    organizationId: order.product?.organizationId ?? null,
    providerProductId: order.productId,
    product: classification.product,
    eligibility: classification.eligibility,
    currency,
    subtotalAmountMinor: order.subtotalAmount,
    discountAmountMinor: order.discountAmount,
    grossAmountMinor: order.netAmount,
    taxAmountMinor: order.taxAmount,
    refundedAmountMinor: order.refundedAmount,
    refundedTaxAmountMinor: order.refundedTaxAmount,
    ...(acquisitionSource === undefined ? {} : { acquisitionSource }),
  };
}

export async function ingestPolarWebhook(
  input: PolarWebhookInput,
  config: PolarWebhookConfig,
  store: RevenueEventStore,
): Promise<PolarWebhookResult> {
  if (!assertConfiguration(config)) {
    return { httpStatus: 503, outcome: "configuration_error" };
  }

  let record: RevenueEventRecord | null;
  try {
    record = verifyAndNormalizePolarWebhook(input, config);
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      return { httpStatus: 403, outcome: "invalid_signature" };
    }
    if (error instanceof RevenueSnapshotError) {
      return { httpStatus: 422, outcome: "invalid_order_snapshot" };
    }
    return { httpStatus: 400, outcome: "invalid_payload" };
  }

  const normalizedHeaders = normalizeHeaders(input.headers);
  const providerEventId = normalizedHeaders["webhook-id"] ?? "";
  if (record === null) {
    return { httpStatus: 202, outcome: "ignored", providerEventId };
  }

  try {
    const outcome = await store.appendIfAbsent(record);
    if (outcome === "conflict") {
      return {
        httpStatus: 202,
        outcome: "accepted_conflict",
        providerEventId: record.providerEventId,
        orderId: record.orderId,
      };
    }
    return {
      httpStatus: 202,
      outcome: outcome === "inserted" ? "accepted" : "duplicate",
      providerEventId: record.providerEventId,
      orderId: record.orderId,
    };
  } catch {
    return { httpStatus: 503, outcome: "storage_unavailable" };
  }
}
