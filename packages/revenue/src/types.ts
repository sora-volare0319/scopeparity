export const REVENUE_EVENT_SCHEMA_VERSION = 1 as const;
export const DEFAULT_GOAL_REVENUE_JPY = 1_000_000;

export type PolarEnvironment = "sandbox" | "production";
export type RevenueProduct = "reservation" | "evidence_workspace" | "drift_guard" | "unmapped";
export type RevenueEventType = "order.paid" | "order.refunded";
export type OrderEligibility =
  | "eligible"
  | "unmapped_product"
  | "unexpected_organization"
  | "unsupported_billing_reason"
  | "recurring_order"
  | "missing_product_snapshot"
  | "recurring_product"
  | "sku_mismatch"
  | "unsupported_currency";

export interface PolarProductRule {
  productId: string;
  product: Exclude<RevenueProduct, "unmapped">;
  sku: string;
  allowedCurrencies: readonly string[];
}

export interface PolarWebhookConfig {
  environment: PolarEnvironment;
  endpointKey: string;
  webhookSecret: string;
  organizationId: string;
  products: readonly PolarProductRule[];
  acquisitionMetadataKey?: string;
}

/**
 * Allowlisted, PII-free snapshot persisted after signature verification.
 * Amounts use the currency's minor unit. Polar's net/refund amounts exclude tax.
 */
export interface RevenueEventRecord {
  schemaVersion: typeof REVENUE_EVENT_SCHEMA_VERSION;
  provider: "polar";
  environment: PolarEnvironment;
  endpointKey: string;
  providerEventId: string;
  payloadSha256: string;
  eventType: RevenueEventType;
  occurredAt: string;
  orderId: string;
  organizationId: string | null;
  providerProductId: string | null;
  product: RevenueProduct;
  eligibility: OrderEligibility;
  currency: string;
  subtotalAmountMinor: number;
  discountAmountMinor: number;
  grossAmountMinor: number;
  taxAmountMinor: number;
  refundedAmountMinor: number;
  refundedTaxAmountMinor: number;
  acquisitionSource?: string;
}

export interface RevenueEventStore {
  /** Only the claimed hash deduplicates; every alternate hash for that logical ID conflicts. */
  appendIfAbsent(event: RevenueEventRecord): Promise<"inserted" | "duplicate" | "conflict">;
}

export interface FxRate {
  /** ISO 4217 source currency, lowercase. */
  currency: string;
  /** UTC purchase date, YYYY-MM-DD. The same rate reverses later refunds. */
  rateDate: string;
  /** JPY minor units per one source minor unit, represented exactly. */
  jpyMinorNumerator: number;
  jpyMinorDenominator: number;
  source: string;
}

export type RevenueOrderStatus =
  | "counted"
  | "fully_refunded"
  | "sandbox"
  | "no_paid_event"
  | "ineligible_order"
  | "product_not_goal"
  | "zero_value"
  | "missing_fx_rate"
  | "conflicting_snapshots";

export interface RevenueOrderSummary {
  environment: PolarEnvironment;
  orderId: string;
  product: RevenueProduct;
  currency: string;
  grossAmountMinor: number;
  refundedAmountMinor: number;
  recognizedAmountMinor: number;
  goalRevenueJpy: number | null;
  status: RevenueOrderStatus;
  appliedFxRate?: FxRate;
  issue?: string;
}

export interface RevenueLedgerSummary {
  goalTargetJpy: number;
  recognizedGoalRevenueJpy: number;
  remainingGoalRevenueJpy: number;
  progressPercent: number;
  uniqueEventCount: number;
  orders: RevenueOrderSummary[];
  nativeGoalRevenueByCurrency: Record<string, number>;
  missingFxOrderCount: number;
}
