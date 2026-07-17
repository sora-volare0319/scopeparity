import type {
  FxRate,
  RevenueEventRecord,
  RevenueLedgerSummary,
  RevenueOrderSummary,
} from "./types.js";
import { DEFAULT_GOAL_REVENUE_JPY } from "./types.js";

export interface BuildRevenueLedgerOptions {
  goalTargetJpy?: number;
  fxRates?: readonly FxRate[];
}

function logicalEventKey(event: RevenueEventRecord): string {
  return JSON.stringify([event.provider, event.environment, event.endpointKey, event.providerEventId]);
}

function exactEventKey(event: RevenueEventRecord): string {
  return JSON.stringify([logicalEventKey(event), event.payloadSha256]);
}

function orderKey(event: RevenueEventRecord): string {
  return JSON.stringify([event.environment, event.orderId]);
}

function rateKey(currency: string, date: string): string {
  return `${currency}:${date}`;
}

function validateRate(rate: FxRate): void {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(rate.rateDate) ||
    rate.currency.trim().length === 0 ||
    rate.source.trim().length === 0 ||
    !Number.isSafeInteger(rate.jpyMinorNumerator) ||
    rate.jpyMinorNumerator <= 0 ||
    !Number.isSafeInteger(rate.jpyMinorDenominator) ||
    rate.jpyMinorDenominator <= 0
  ) {
    throw new Error("FX rates require a date, source, and positive integer ratio");
  }
}

function convertToJpy(
  amountMinor: number,
  currency: string,
  purchaseDate: string,
  rates: Map<string, FxRate>,
): { amount: number; appliedRate: FxRate | null } | null {
  if (currency === "jpy") {
    return { amount: amountMinor, appliedRate: null };
  }
  const rate = rates.get(rateKey(currency, purchaseDate));
  if (rate === undefined) {
    return null;
  }
  const converted = (BigInt(amountMinor) * BigInt(rate.jpyMinorNumerator)) / BigInt(rate.jpyMinorDenominator);
  if (converted > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error("Converted JPY amount exceeds the safe integer range");
  }
  return { amount: Number(converted), appliedRate: { ...rate } };
}

function paidSnapshotsConflict(paidEvents: readonly RevenueEventRecord[]): boolean {
  const first = paidEvents[0];
  if (first === undefined) {
    return false;
  }
  return paidEvents.some(
    (event) =>
      event.providerProductId !== first.providerProductId ||
      event.product !== first.product ||
      event.currency !== first.currency ||
      event.grossAmountMinor !== first.grossAmountMinor ||
      event.taxAmountMinor !== first.taxAmountMinor ||
      event.eligibility !== first.eligibility,
  );
}

export function buildRevenueLedger(
  inputEvents: readonly RevenueEventRecord[],
  options: BuildRevenueLedgerOptions = {},
): RevenueLedgerSummary {
  const goalTargetJpy = options.goalTargetJpy ?? DEFAULT_GOAL_REVENUE_JPY;
  if (!Number.isSafeInteger(goalTargetJpy) || goalTargetJpy <= 0) {
    throw new Error("Goal target must be a positive safe integer");
  }

  const rates = new Map<string, FxRate>();
  for (const rate of options.fxRates ?? []) {
    validateRate(rate);
    const normalized = { ...rate, currency: rate.currency.toLowerCase() };
    const key = rateKey(normalized.currency, normalized.rateDate);
    if (rates.has(key)) {
      throw new Error(`Duplicate FX rate: ${key}`);
    }
    rates.set(key, normalized);
  }

  const deduplicated = new Map<string, RevenueEventRecord>();
  const hashesByLogicalEvent = new Map<string, Set<string>>();
  for (const event of inputEvents) {
    deduplicated.set(exactEventKey(event), event);
    const logicalKey = logicalEventKey(event);
    const hashes = hashesByLogicalEvent.get(logicalKey) ?? new Set<string>();
    hashes.add(event.payloadSha256);
    hashesByLogicalEvent.set(logicalKey, hashes);
  }
  const conflictingLogicalEvents = new Set(
    [...hashesByLogicalEvent.entries()].filter(([, hashes]) => hashes.size > 1).map(([key]) => key),
  );

  const groups = new Map<string, RevenueEventRecord[]>();
  for (const event of deduplicated.values()) {
    const key = orderKey(event);
    const group = groups.get(key) ?? [];
    group.push(event);
    groups.set(key, group);
  }

  const orders: RevenueOrderSummary[] = [];
  const nativeGoalRevenueByCurrency: Record<string, number> = {};
  let recognizedGoalRevenueJpy = 0;
  let missingFxOrderCount = 0;

  for (const group of groups.values()) {
    const sorted = [...group].sort((left, right) => left.occurredAt.localeCompare(right.occurredAt));
    const firstEvent = sorted[0];
    if (firstEvent === undefined) {
      continue;
    }
    const hasEventIdConflict = sorted.some((event) => conflictingLogicalEvents.has(logicalEventKey(event)));
    if (hasEventIdConflict) {
      orders.push({
        environment: firstEvent.environment,
        orderId: firstEvent.orderId,
        product: firstEvent.product,
        currency: firstEvent.currency,
        grossAmountMinor: firstEvent.grossAmountMinor,
        refundedAmountMinor: Math.max(...sorted.map((event) => event.refundedAmountMinor)),
        recognizedAmountMinor: 0,
        goalRevenueJpy: null,
        status: "conflicting_snapshots",
        issue: "The same signed webhook ID was observed with more than one payload hash.",
      });
      continue;
    }
    const paidEvents = sorted.filter((event) => event.eventType === "order.paid");
    const paid = paidEvents[0];
    if (paid === undefined) {
      orders.push({
        environment: firstEvent.environment,
        orderId: firstEvent.orderId,
        product: firstEvent.product,
        currency: firstEvent.currency,
        grossAmountMinor: firstEvent.grossAmountMinor,
        refundedAmountMinor: Math.max(...sorted.map((event) => event.refundedAmountMinor)),
        recognizedAmountMinor: 0,
        goalRevenueJpy: null,
        status: "no_paid_event",
        issue: "A refund snapshot exists without a verified order.paid event.",
      });
      continue;
    }

    const relatedSnapshots = sorted.filter(
      (event) => event.providerProductId === paid.providerProductId && event.currency === paid.currency,
    );
    const hasSnapshotConflict = relatedSnapshots.length !== sorted.length || paidSnapshotsConflict(paidEvents);
    const refundedAmountMinor = Math.max(...relatedSnapshots.map((event) => event.refundedAmountMinor));
    const recognizedAmountMinor = Math.max(0, paid.grossAmountMinor - refundedAmountMinor);
    const base = {
      environment: paid.environment,
      orderId: paid.orderId,
      product: paid.product,
      currency: paid.currency,
      grossAmountMinor: paid.grossAmountMinor,
      refundedAmountMinor,
      recognizedAmountMinor,
    };

    if (hasSnapshotConflict) {
      orders.push({
        ...base,
        goalRevenueJpy: null,
        status: "conflicting_snapshots",
        issue: "Order snapshots disagree on immutable product, currency, or paid amount facts.",
      });
      continue;
    }
    if (paid.environment !== "production") {
      orders.push({ ...base, goalRevenueJpy: null, status: "sandbox" });
      continue;
    }
    if (paid.eligibility !== "eligible") {
      orders.push({
        ...base,
        goalRevenueJpy: null,
        status: "ineligible_order",
        issue: paid.eligibility,
      });
      continue;
    }
    if (paid.product !== "evidence_workspace") {
      orders.push({ ...base, goalRevenueJpy: null, status: "product_not_goal" });
      continue;
    }
    if (paid.grossAmountMinor === 0) {
      orders.push({ ...base, goalRevenueJpy: 0, status: "zero_value" });
      continue;
    }

    nativeGoalRevenueByCurrency[paid.currency] =
      (nativeGoalRevenueByCurrency[paid.currency] ?? 0) + recognizedAmountMinor;
    if (recognizedAmountMinor === 0) {
      orders.push({ ...base, goalRevenueJpy: 0, status: "fully_refunded" });
      continue;
    }
    const purchaseDate = paid.occurredAt.slice(0, 10);
    const conversion = convertToJpy(recognizedAmountMinor, paid.currency, purchaseDate, rates);
    if (conversion === null) {
      missingFxOrderCount += 1;
      orders.push({
        ...base,
        goalRevenueJpy: null,
        status: "missing_fx_rate",
        issue: `No documented ${paid.currency.toUpperCase()} to JPY rate for ${purchaseDate}.`,
      });
      continue;
    }

    recognizedGoalRevenueJpy += conversion.amount;
    orders.push({
      ...base,
      goalRevenueJpy: conversion.amount,
      status: "counted",
      ...(conversion.appliedRate === null ? {} : { appliedFxRate: conversion.appliedRate }),
    });
  }

  orders.sort((left, right) => `${left.environment}:${left.orderId}`.localeCompare(`${right.environment}:${right.orderId}`));
  return {
    goalTargetJpy,
    recognizedGoalRevenueJpy,
    remainingGoalRevenueJpy: Math.max(0, goalTargetJpy - recognizedGoalRevenueJpy),
    progressPercent: Math.min(100, (recognizedGoalRevenueJpy / goalTargetJpy) * 100),
    uniqueEventCount: deduplicated.size,
    orders,
    nativeGoalRevenueByCurrency,
    missingFxOrderCount,
  };
}
