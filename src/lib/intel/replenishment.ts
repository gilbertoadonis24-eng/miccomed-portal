import type { InventorySku, ReplenishmentAlert } from "./types";

/** Meses mínimos de historia de demanda para evaluar reposición. */
export const MIN_DEMAND_HISTORY_MONTHS = 6;

/** Umbral de cobertura (meses) — en o por debajo → sugerir reposición. */
export const MAX_COVER_MONTHS_BEFORE_REPLENISH = 3;

/** Horizonte de compra sugerida (meses de demanda). */
export const REPLENISH_TARGET_COVER_MONTHS = 3;

export type CoverMetrics = {
  monthsOfHistory: number;
  avgMonthlyDemand: number;
  monthsOfCover: number | null;
  eligible: boolean;
  needsReplenishment: boolean;
  suggestedQty: number;
};

/**
 * Regla MiccoMed V1:
 * si hay ≥6 meses de demanda histórica y la cobertura on-hand es ≤3 meses,
 * sugerir reposición = max(0, demanda_promedio×3 − on_hand).
 */
export function evaluateCover(
  onHand: number,
  monthlyDemand: number[],
): CoverMetrics {
  const monthsOfHistory = monthlyDemand.length;
  const eligible = monthsOfHistory >= MIN_DEMAND_HISTORY_MONTHS;
  const sum = monthlyDemand.reduce((a, b) => a + b, 0);
  const avgMonthlyDemand =
    monthsOfHistory > 0 ? sum / monthsOfHistory : 0;

  if (!eligible || avgMonthlyDemand <= 0) {
    return {
      monthsOfHistory,
      avgMonthlyDemand,
      monthsOfCover: avgMonthlyDemand > 0 ? onHand / avgMonthlyDemand : null,
      eligible,
      needsReplenishment: false,
      suggestedQty: 0,
    };
  }

  const monthsOfCover = onHand / avgMonthlyDemand;
  const needsReplenishment = monthsOfCover <= MAX_COVER_MONTHS_BEFORE_REPLENISH;
  const target = avgMonthlyDemand * REPLENISH_TARGET_COVER_MONTHS;
  const suggestedQty = needsReplenishment
    ? Math.max(0, Math.ceil(target - onHand))
    : 0;

  return {
    monthsOfHistory,
    avgMonthlyDemand,
    monthsOfCover,
    eligible,
    needsReplenishment,
    suggestedQty,
  };
}

export function buildReplenishmentAlerts(
  inventory: InventorySku[],
): ReplenishmentAlert[] {
  const alerts: ReplenishmentAlert[] = [];
  for (const sku of inventory) {
    const m = evaluateCover(sku.onHand, sku.monthlyDemand);
    if (!m.needsReplenishment) continue;
    alerts.push({
      skuCode: sku.skuCode,
      title: sku.title,
      monthsOfHistory: m.monthsOfHistory,
      avgMonthlyDemand: round1(m.avgMonthlyDemand),
      onHand: sku.onHand,
      monthsOfCover: round2(m.monthsOfCover ?? 0),
      suggestedQty: m.suggestedQty,
      reason: `Historia ${m.monthsOfHistory}m ≥ ${MIN_DEMAND_HISTORY_MONTHS}m y cobertura ${round2(m.monthsOfCover ?? 0)}m ≤ ${MAX_COVER_MONTHS_BEFORE_REPLENISH}m`,
    });
  }
  return alerts.sort((a, b) => a.monthsOfCover - b.monthsOfCover);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
