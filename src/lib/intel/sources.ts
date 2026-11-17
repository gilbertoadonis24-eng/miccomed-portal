/**
 * Fuentes crudas del tablero. Seed DEMO por defecto; Excel puede sustituir
 * dominios sueltos sin tocar el resto.
 */
import {
  intelClients,
  intelCompetitors,
  intelExpenses,
  intelInventory,
  intelMarkets,
  intelOpportunities,
  intelPayroll,
  intelPurchases,
  intelSales,
} from "./seed";
import type {
  ClientRow,
  CompetitorRow,
  ExpenseRow,
  InventorySku,
  MarketSignal,
  PayrollRow,
  PriceOpportunity,
  PurchaseRow,
  SalesRow,
} from "./types";

export type MarginSkuRow = {
  skuCode: string;
  title: string;
  marginPct: number;
  sales: number;
};

export type IntelSourceData = {
  markets: MarketSignal[];
  competitors: CompetitorRow[];
  opportunities: PriceOpportunity[];
  purchases: PurchaseRow[];
  sales: SalesRow[];
  /** Si está definido, sustituye el margen derivado de ventas. */
  margins?: MarginSkuRow[];
  expenses: ExpenseRow[];
  payroll: PayrollRow[];
  inventory: InventorySku[];
  clients: ClientRow[];
};

export type IntelSourceKey = keyof IntelSourceData;

export function defaultIntelSources(): IntelSourceData {
  return {
    markets: intelMarkets,
    competitors: intelCompetitors,
    opportunities: intelOpportunities,
    purchases: intelPurchases,
    sales: intelSales,
    expenses: intelExpenses,
    payroll: intelPayroll,
    inventory: intelInventory,
    clients: intelClients,
  };
}

export function mergeIntelSources(
  overrides: Partial<IntelSourceData> = {},
): IntelSourceData {
  const base = defaultIntelSources();
  return {
    ...base,
    ...overrides,
    // margins es opcional: solo se copia si viene en overrides
    margins: overrides.margins ?? base.margins,
  };
}
