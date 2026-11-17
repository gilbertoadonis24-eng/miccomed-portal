/** Tipos del módulo de inteligencia comercial (demo V1). */

export type IntelSectionId =
  | "overview"
  | "markets"
  | "compras"
  | "ventas"
  | "margenes"
  | "gastos"
  | "rotacion"
  | "clientes"
  | "reposicion";

export type MonthlyPoint = {
  month: string; // YYYY-MM
  amount: number;
};

export type MarketSignal = {
  id: string;
  market: string;
  segment: string;
  growthPct: number;
  note: string;
};

export type CompetitorRow = {
  id: string;
  name: string;
  focus: string;
  priceIndex: number; // 100 = paridad MiccoMed
  strength: string;
  weakness: string;
};

export type PriceOpportunity = {
  id: string;
  skuCode: string;
  title: string;
  ourPrice: number;
  competitorAvg: number;
  gapPct: number;
  action: string;
};

export type PurchaseRow = {
  id: string;
  poDate: string;
  vendor: string;
  skuCode: string;
  qty: number;
  unitCost: number;
  total: number;
};

export type SalesRow = {
  id: string;
  invoiceDate: string;
  customerCode: string;
  customerName: string;
  skuCode: string;
  qty: number;
  unitPrice: number;
  ulc: number;
  total: number;
};

export type ExpenseRow = {
  id: string;
  month: string;
  category: string;
  label: string;
  amount: number;
};

export type PayrollRow = {
  id: string;
  month: string;
  role: string;
  headcount: number;
  gross: number;
};

export type InventorySku = {
  skuCode: string;
  title: string;
  category: string;
  onHand: number;
  /** Demanda mensual (unidades) — más reciente al final */
  monthlyDemand: number[];
  avgCost: number;
  lots: { lot: string; qty: number; expiry: string | null }[];
};

export type ClientRow = {
  code: string;
  legalName: string;
  tier: string;
  lastOrderDate: string | null;
  trailing12mSales: number;
  status: "activo" | "inactivo";
  inactiveReason?: string;
};

export type ReplenishmentAlert = {
  skuCode: string;
  title: string;
  monthsOfHistory: number;
  avgMonthlyDemand: number;
  onHand: number;
  monthsOfCover: number;
  suggestedQty: number;
  reason: string;
};

export type IntelOverviewKpis = {
  salesMtd: number;
  salesYtd: number;
  purchaseMtd: number;
  grossMarginPct: number;
  expenseMtd: number;
  payrollMtd: number;
  activeClients: number;
  inactiveClients: number;
  replenishmentAlerts: number;
  inventoryTurns: number;
};

export type InventoryTurnRow = {
  skuCode: string;
  title: string;
  avgInventory: number;
  cogsTrailing12m: number;
  turns: number;
  monthsOfCover: number | null;
  historyMonths: number;
};

export type IntelDashboardSnapshot = {
  generatedAt: string;
  periodLabel: string;
  isDemo: true;
  overview: IntelOverviewKpis;
  markets: MarketSignal[];
  competitors: CompetitorRow[];
  opportunities: PriceOpportunity[];
  purchases: PurchaseRow[];
  purchasesByMonth: MonthlyPoint[];
  sales: SalesRow[];
  salesByMonth: MonthlyPoint[];
  marginBySku: { skuCode: string; title: string; marginPct: number; sales: number }[];
  expenses: ExpenseRow[];
  payroll: PayrollRow[];
  inventoryTurns: InventoryTurnRow[];
  clients: ClientRow[];
  replenishment: ReplenishmentAlert[];
  inventoryWatch: InventorySku[];
};
