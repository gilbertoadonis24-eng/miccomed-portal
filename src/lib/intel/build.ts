import {
  buildReplenishmentAlerts,
  evaluateCover,
} from "./replenishment";
import { INTEL_PERIOD_LABEL } from "./seed";
import {
  mergeIntelSources,
  type IntelSourceData,
} from "./sources";
import type {
  IntelDashboardSnapshot,
  InventoryTurnRow,
  MonthlyPoint,
} from "./types";

const CURRENT_MONTH = "2025-11";

export function buildIntelDashboard(
  overrides: Partial<IntelSourceData> = {},
): IntelDashboardSnapshot {
  const src = mergeIntelSources(overrides);
  const loadedKeys = (Object.keys(overrides) as (keyof IntelSourceData)[]).filter(
    (k) => overrides[k] !== undefined,
  );

  const salesByMonth = aggregateByMonth(
    src.sales.map((s) => ({ date: s.invoiceDate, amount: s.total })),
  );
  const purchasesByMonth = aggregateByMonth(
    src.purchases.map((p) => ({ date: p.poDate, amount: p.total })),
  );

  const salesMtd = sumBy(
    src.sales.filter((s) => s.invoiceDate.startsWith(CURRENT_MONTH)),
    (s) => s.total,
  );
  const salesYtd = sumBy(salesByMonth, (p) => p.amount);
  const purchaseMtd = sumBy(
    src.purchases.filter((p) => p.poDate.startsWith(CURRENT_MONTH)),
    (p) => p.total,
  );

  const salesCogs = sumBy(src.sales, (s) => s.ulc * s.qty);
  const salesRev = sumBy(src.sales, (s) => s.total);
  const grossMarginPct =
    salesRev > 0 ? ((salesRev - salesCogs) / salesRev) * 100 : 0;

  const expenseMtd = sumBy(
    src.expenses.filter((e) => e.month === CURRENT_MONTH),
    (e) => e.amount,
  );
  const payrollMtd = sumBy(
    src.payroll.filter((p) => p.month === CURRENT_MONTH),
    (p) => p.gross,
  );

  const activeClients = src.clients.filter((c) => c.status === "activo").length;
  const inactiveClients = src.clients.filter((c) => c.status === "inactivo").length;

  const replenishment = buildReplenishmentAlerts(src.inventory);

  const inventoryTurns = buildInventoryTurns(src.inventory);
  const inventoryTurnsAvg =
    inventoryTurns.length > 0
      ? inventoryTurns.reduce((a, r) => a + r.turns, 0) / inventoryTurns.length
      : 0;

  const marginBySku =
    src.margins && src.margins.length > 0
      ? [...src.margins].sort((a, b) => b.sales - a.sales)
      : buildMarginBySku(src);

  return {
    generatedAt: new Date().toISOString(),
    periodLabel: INTEL_PERIOD_LABEL,
    isDemo: true,
    loadedFromExcel: loadedKeys.length > 0,
    loadedSourceKeys: loadedKeys.map(String),
    overview: {
      salesMtd,
      salesYtd,
      purchaseMtd,
      grossMarginPct: round1(grossMarginPct),
      expenseMtd,
      payrollMtd,
      activeClients,
      inactiveClients,
      replenishmentAlerts: replenishment.length,
      inventoryTurns: round1(inventoryTurnsAvg),
    },
    markets: src.markets,
    competitors: src.competitors,
    opportunities: src.opportunities,
    purchases: src.purchases,
    purchasesByMonth,
    sales: src.sales,
    salesByMonth,
    marginBySku,
    expenses: src.expenses,
    payroll: src.payroll,
    inventoryTurns,
    clients: src.clients,
    replenishment,
    inventoryWatch: src.inventory,
  };
}

/** Agrupa montos por YYYY-MM a partir de filas (facturas/PO) — fuente única de verdad. */
export function aggregateByMonth(
  rows: { date: string; amount: number }[],
): MonthlyPoint[] {
  const map = new Map<string, number>();
  for (const row of rows) {
    const month = row.date.slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(month)) continue;
    map.set(month, (map.get(month) ?? 0) + row.amount);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, amount]) => ({ month, amount }));
}

function buildMarginBySku(src: IntelSourceData) {
  const map = new Map<
    string,
    { skuCode: string; title: string; sales: number; cogs: number }
  >();
  for (const s of src.sales) {
    const inv = src.inventory.find((i) => i.skuCode === s.skuCode);
    const cur = map.get(s.skuCode) ?? {
      skuCode: s.skuCode,
      title: inv?.title ?? s.skuCode,
      sales: 0,
      cogs: 0,
    };
    cur.sales += s.total;
    cur.cogs += s.ulc * s.qty;
    map.set(s.skuCode, cur);
  }
  return [...map.values()]
    .map((r) => ({
      skuCode: r.skuCode,
      title: r.title,
      sales: r.sales,
      marginPct: r.sales > 0 ? round1(((r.sales - r.cogs) / r.sales) * 100) : 0,
    }))
    .sort((a, b) => b.sales - a.sales);
}

function buildInventoryTurns(inventory: IntelSourceData["inventory"]): InventoryTurnRow[] {
  return inventory.map((sku) => {
    const cover = evaluateCover(sku.onHand, sku.monthlyDemand);
    const avgDemand =
      sku.monthlyDemand.length > 0
        ? sku.monthlyDemand.reduce((a, b) => a + b, 0) / sku.monthlyDemand.length
        : 0;
    const cogsTrailing12m = avgDemand * 12 * sku.avgCost;
    const avgInventory = Math.max(sku.onHand, 1) * sku.avgCost;
    const turns = avgInventory > 0 ? cogsTrailing12m / avgInventory : 0;
    return {
      skuCode: sku.skuCode,
      title: sku.title,
      avgInventory: round2(avgInventory),
      cogsTrailing12m: round2(cogsTrailing12m),
      turns: round1(turns),
      monthsOfCover:
        cover.monthsOfCover === null ? null : round2(cover.monthsOfCover),
      historyMonths: cover.monthsOfHistory,
    };
  });
}

function sumBy<T>(rows: T[], fn: (row: T) => number): number {
  return rows.reduce((acc, row) => acc + fn(row), 0);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
