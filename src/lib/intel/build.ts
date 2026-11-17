import {
  buildReplenishmentAlerts,
  evaluateCover,
} from "./replenishment";
import {
  INTEL_PERIOD_LABEL,
  intelClients,
  intelCompetitors,
  intelExpenses,
  intelInventory,
  intelMarkets,
  intelOpportunities,
  intelPayroll,
  intelPurchases,
  intelPurchasesByMonth,
  intelSales,
  intelSalesByMonth,
} from "./seed";
import type {
  IntelDashboardSnapshot,
  InventoryTurnRow,
} from "./types";

const CURRENT_MONTH = "2025-11";

export function buildIntelDashboard(): IntelDashboardSnapshot {
  const salesMtd = sumBy(
    intelSales.filter((s) => s.invoiceDate.startsWith(CURRENT_MONTH)),
    (s) => s.total,
  );
  const salesYtd = sumBy(intelSalesByMonth, (p) => p.amount);
  const purchaseMtd = sumBy(
    intelPurchases.filter((p) => p.poDate.startsWith(CURRENT_MONTH)),
    (p) => p.total,
  );

  const salesCogs = sumBy(intelSales, (s) => s.ulc * s.qty);
  const salesRev = sumBy(intelSales, (s) => s.total);
  const grossMarginPct =
    salesRev > 0 ? ((salesRev - salesCogs) / salesRev) * 100 : 0;

  const expenseMtd = sumBy(
    intelExpenses.filter((e) => e.month === CURRENT_MONTH),
    (e) => e.amount,
  );
  const payrollMtd = sumBy(
    intelPayroll.filter((p) => p.month === CURRENT_MONTH),
    (p) => p.gross,
  );

  const activeClients = intelClients.filter((c) => c.status === "activo").length;
  const inactiveClients = intelClients.filter((c) => c.status === "inactivo").length;

  const replenishment = buildReplenishmentAlerts(intelInventory);

  const inventoryTurns = buildInventoryTurns();
  const inventoryTurnsAvg =
    inventoryTurns.length > 0
      ? inventoryTurns.reduce((a, r) => a + r.turns, 0) / inventoryTurns.length
      : 0;

  const marginBySku = buildMarginBySku();

  return {
    generatedAt: "2025-11-17T12:00:00.000Z",
    periodLabel: INTEL_PERIOD_LABEL,
    isDemo: true,
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
    markets: intelMarkets,
    competitors: intelCompetitors,
    opportunities: intelOpportunities,
    purchases: intelPurchases,
    purchasesByMonth: intelPurchasesByMonth,
    sales: intelSales,
    salesByMonth: intelSalesByMonth,
    marginBySku,
    expenses: intelExpenses,
    payroll: intelPayroll,
    inventoryTurns,
    clients: intelClients,
    replenishment,
    inventoryWatch: intelInventory,
  };
}

function buildMarginBySku() {
  const map = new Map<
    string,
    { skuCode: string; title: string; sales: number; cogs: number }
  >();
  for (const s of intelSales) {
    const inv = intelInventory.find((i) => i.skuCode === s.skuCode);
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

function buildInventoryTurns(): InventoryTurnRow[] {
  return intelInventory.map((sku) => {
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
