/**
 * Parseo / serialización de plantillas Excel demo (client + scripts).
 */
import * as XLSX from "xlsx";
import {
  DEMO_ROW_COUNT,
  EXCEL_DOMAINS,
  type ExcelDomainId,
  templateClients,
  templateCompetitors,
  templateDemanda,
  templateExpenses,
  templateInventory,
  templateMargins,
  templateMarkets,
  templateOpportunities,
  templatePayroll,
  templatePurchases,
  templateSales,
} from "./excel-domains";
import type { IntelSourceData, MarginSkuRow } from "./sources";
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

export type ParsedExcelPatch = Partial<IntelSourceData> & {
  domain: ExcelDomainId;
  rowCounts: Record<string, number>;
};

export type ExcelParseResult =
  | { ok: true; patch: ParsedExcelPatch }
  | { ok: false; error: string };

function cellStr(row: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v === undefined || v === null || v === "") continue;
    return String(v).trim();
  }
  return "";
}

function cellNum(row: Record<string, unknown>, ...keys: string[]): number {
  for (const k of keys) {
    const v = row[k];
    if (v === undefined || v === null || v === "") continue;
    const n = typeof v === "number" ? v : Number(String(v).replace(/,/g, ""));
    if (!Number.isNaN(n)) return n;
  }
  return 0;
}

function sheetToRows(wb: XLSX.WorkBook, name: string): Record<string, unknown>[] {
  const sheet = wb.Sheets[name] ?? wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: true,
  });
}

function findSheet(wb: XLSX.WorkBook, candidates: string[]): string | null {
  const lower = Object.fromEntries(
    wb.SheetNames.map((n) => [n.toLowerCase(), n]),
  );
  for (const c of candidates) {
    if (lower[c.toLowerCase()]) return lower[c.toLowerCase()];
  }
  return wb.SheetNames[0] ?? null;
}

function parsePurchases(rows: Record<string, unknown>[]): PurchaseRow[] {
  return rows.map((r, i) => {
    const qty = cellNum(r, "qty", "Qty", "cantidad");
    const unitCost = cellNum(r, "unitCost", "unit_cost", "costo_u", "Costo u.");
    const total = cellNum(r, "total", "Total") || qty * unitCost;
    return {
      id: cellStr(r, "id", "Id") || `po-xls-${i + 1}`,
      poDate: cellStr(r, "poDate", "po_date", "fecha", "Fecha"),
      vendor: cellStr(r, "vendor", "Vendor", "proveedor"),
      skuCode: cellStr(r, "skuCode", "sku_code", "SKU", "sku"),
      qty,
      unitCost,
      total,
    };
  });
}

function parseSales(rows: Record<string, unknown>[]): SalesRow[] {
  return rows.map((r, i) => {
    const qty = cellNum(r, "qty", "Qty", "cantidad");
    const unitPrice = cellNum(r, "unitPrice", "unit_price", "precio", "Precio");
    const ulc = cellNum(r, "ulc", "ULC", "costo");
    const total = cellNum(r, "total", "Total") || qty * unitPrice;
    return {
      id: cellStr(r, "id", "Id") || `inv-xls-${i + 1}`,
      invoiceDate: cellStr(r, "invoiceDate", "invoice_date", "fecha", "Fecha"),
      customerCode: cellStr(r, "customerCode", "customer_code", "cliente", "Cliente"),
      customerName: cellStr(r, "customerName", "customer_name", "razon_social"),
      skuCode: cellStr(r, "skuCode", "sku_code", "SKU", "sku"),
      qty,
      unitPrice,
      ulc,
      total,
    };
  });
}

function parseMargins(rows: Record<string, unknown>[]): MarginSkuRow[] {
  return rows.map((r) => ({
    skuCode: cellStr(r, "skuCode", "sku_code", "SKU", "sku"),
    title: cellStr(r, "title", "Title", "titulo", "nombre"),
    sales: cellNum(r, "sales", "Sales", "ventas", "Ventas"),
    marginPct: cellNum(r, "marginPct", "margin_pct", "margen_pct", "Margen %"),
  }));
}

function parseExpenses(rows: Record<string, unknown>[]): ExpenseRow[] {
  return rows.map((r, i) => ({
    id: cellStr(r, "id", "Id") || `exp-xls-${i + 1}`,
    month: cellStr(r, "month", "Month", "mes", "Mes"),
    category: cellStr(r, "category", "Category", "categoria", "Categoría"),
    label: cellStr(r, "label", "Label", "concepto", "Concepto"),
    amount: cellNum(r, "amount", "Amount", "monto", "Monto"),
  }));
}

function parsePayroll(rows: Record<string, unknown>[]): PayrollRow[] {
  return rows.map((r, i) => ({
    id: cellStr(r, "id", "Id") || `pay-xls-${i + 1}`,
    month: cellStr(r, "month", "Month", "mes", "Mes"),
    role: cellStr(r, "role", "Role", "rol", "Rol"),
    headcount: cellNum(r, "headcount", "Headcount", "hc"),
    gross: cellNum(r, "gross", "Gross", "bruto", "Bruto"),
  }));
}

function demandCell(row: Record<string, unknown>, m: number): number | null {
  for (const key of [`d${m}`, `demanda_m${m}`, `D${m}`]) {
    if (!(key in row)) continue;
    const v = row[key];
    if (v === undefined || v === null || v === "") return null;
    const n = typeof v === "number" ? v : Number(String(v).replace(/,/g, ""));
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

function parseInventory(rows: Record<string, unknown>[]): InventorySku[] {
  return rows.map((r) => {
    const monthlyDemand: number[] = [];
    for (let m = 1; m <= 12; m++) {
      const n = demandCell(r, m);
      if (n === null) {
        // Columnas vacías al final no cuentan como historia
        if (monthlyDemand.length > 0) break;
        continue;
      }
      monthlyDemand.push(n);
    }
    // Fallback: comma-separated "demanda"
    if (monthlyDemand.length === 0) {
      const raw = cellStr(r, "demanda", "monthlyDemand", "monthly_demand");
      if (raw) {
        for (const part of raw.split(/[|;,]/)) {
          const n = Number(part.trim());
          if (!Number.isNaN(n)) monthlyDemand.push(n);
        }
      }
    }
    return {
      skuCode: cellStr(r, "skuCode", "sku_code", "SKU", "sku"),
      title: cellStr(r, "title", "Title", "titulo"),
      category: cellStr(r, "category", "Category", "categoria") || "General",
      onHand: cellNum(r, "onHand", "on_hand", "stock", "On-hand"),
      monthlyDemand,
      avgCost: cellNum(r, "avgCost", "avg_cost", "costo_avg"),
      lots: [
        {
          lot: cellStr(r, "lot", "lote") || "XLS",
          qty: cellNum(r, "onHand", "on_hand", "stock", "On-hand"),
          expiry: cellStr(r, "expiry", "vencimiento") || null,
        },
      ],
    };
  });
}

function parseClients(rows: Record<string, unknown>[]): ClientRow[] {
  return rows.map((r) => {
    const statusRaw = cellStr(r, "status", "Status", "estado", "Estado").toLowerCase();
    const status: ClientRow["status"] =
      statusRaw.startsWith("inact") ? "inactivo" : "activo";
    const last = cellStr(r, "lastOrderDate", "last_order_date", "ultimo_pedido");
    return {
      code: cellStr(r, "code", "Code", "codigo", "Código"),
      legalName: cellStr(r, "legalName", "legal_name", "razon_social", "Razón social"),
      tier: cellStr(r, "tier", "Tier"),
      lastOrderDate: last === "" || last === "—" ? null : last,
      trailing12mSales: cellNum(r, "trailing12mSales", "trailing_12m_sales", "ventas_12m"),
      status,
      inactiveReason:
        cellStr(r, "inactiveReason", "inactive_reason", "motivo") || undefined,
    };
  });
}

function parseMarkets(rows: Record<string, unknown>[]): MarketSignal[] {
  return rows.map((r, i) => ({
    id: cellStr(r, "id", "Id") || `mkt-xls-${i + 1}`,
    market: cellStr(r, "market", "Market", "mercado", "Mercado"),
    segment: cellStr(r, "segment", "Segment", "segmento", "Segmento"),
    growthPct: cellNum(r, "growthPct", "growth_pct", "crecimiento", "Crecimiento"),
    note: cellStr(r, "note", "Note", "nota", "Nota"),
  }));
}

function parseCompetitors(rows: Record<string, unknown>[]): CompetitorRow[] {
  return rows.map((r, i) => ({
    id: cellStr(r, "id", "Id") || `comp-xls-${i + 1}`,
    name: cellStr(r, "name", "Name", "nombre", "Nombre"),
    focus: cellStr(r, "focus", "Focus", "foco", "Foco"),
    priceIndex: cellNum(r, "priceIndex", "price_index", "indice_precio", "Índice precio"),
    strength: cellStr(r, "strength", "Strength", "fortaleza", "Fortaleza"),
    weakness: cellStr(r, "weakness", "Weakness", "debilidad", "Debilidad"),
  }));
}

function parseOpportunities(rows: Record<string, unknown>[]): PriceOpportunity[] {
  return rows.map((r, i) => ({
    id: cellStr(r, "id", "Id") || `opp-xls-${i + 1}`,
    skuCode: cellStr(r, "skuCode", "sku_code", "SKU", "sku"),
    title: cellStr(r, "title", "Title", "titulo"),
    ourPrice: cellNum(r, "ourPrice", "our_price", "nuestro", "Nuestro"),
    competitorAvg: cellNum(r, "competitorAvg", "competitor_avg", "rival_avg", "Rival avg"),
    gapPct: cellNum(r, "gapPct", "gap_pct", "gap", "Gap"),
    action: cellStr(r, "action", "Action", "accion", "Acción"),
  }));
}

function requireRows(
  rows: unknown[],
  label: string,
): string | null {
  if (rows.length === 0) return `La hoja «${label}» no tiene filas de datos.`;
  return null;
}

/** Parsea un ArrayBuffer de .xlsx para un dominio conocido. */
export function parseIntelExcel(
  domain: ExcelDomainId,
  data: ArrayBuffer,
): ExcelParseResult {
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(data, { type: "array" });
  } catch {
    return { ok: false, error: "No se pudo leer el archivo Excel." };
  }
  if (!wb.SheetNames.length) {
    return { ok: false, error: "El libro no contiene hojas." };
  }

  try {
    switch (domain) {
      case "compras": {
        const name = findSheet(wb, ["Compras", "compras", "Purchases"])!;
        const rows = sheetToRows(wb, name);
        const err = requireRows(rows, name);
        if (err) return { ok: false, error: err };
        const purchases = parsePurchases(rows);
        return {
          ok: true,
          patch: { domain, purchases, rowCounts: { purchases: purchases.length } },
        };
      }
      case "ventas": {
        const name = findSheet(wb, ["Ventas", "ventas", "Sales"])!;
        const rows = sheetToRows(wb, name);
        const err = requireRows(rows, name);
        if (err) return { ok: false, error: err };
        const sales = parseSales(rows);
        return {
          ok: true,
          patch: { domain, sales, rowCounts: { sales: sales.length } },
        };
      }
      case "margenes": {
        const name = findSheet(wb, ["Márgenes", "Margenes", "margenes", "Margins"])!;
        const rows = sheetToRows(wb, name);
        const err = requireRows(rows, name);
        if (err) return { ok: false, error: err };
        const margins = parseMargins(rows);
        return {
          ok: true,
          patch: { domain, margins, rowCounts: { margins: margins.length } },
        };
      }
      case "gastos": {
        const name = findSheet(wb, ["Gastos", "gastos", "Expenses"])!;
        const rows = sheetToRows(wb, name);
        const err = requireRows(rows, name);
        if (err) return { ok: false, error: err };
        const expenses = parseExpenses(rows);
        return {
          ok: true,
          patch: { domain, expenses, rowCounts: { expenses: expenses.length } },
        };
      }
      case "nomina": {
        const name = findSheet(wb, ["Nómina", "Nomina", "nomina", "Payroll"])!;
        const rows = sheetToRows(wb, name);
        const err = requireRows(rows, name);
        if (err) return { ok: false, error: err };
        const payroll = parsePayroll(rows);
        return {
          ok: true,
          patch: { domain, payroll, rowCounts: { payroll: payroll.length } },
        };
      }
      case "inventario":
      case "demanda": {
        const name = findSheet(wb, [
          domain === "demanda" ? "Demanda" : "Inventario",
          "Demanda",
          "Inventario",
          "Inventory",
        ])!;
        const rows = sheetToRows(wb, name);
        const err = requireRows(rows, name);
        if (err) return { ok: false, error: err };
        const inventory = parseInventory(rows);
        return {
          ok: true,
          patch: { domain, inventory, rowCounts: { inventory: inventory.length } },
        };
      }
      case "clientes": {
        const name = findSheet(wb, ["Clientes", "clientes", "Clients"])!;
        const rows = sheetToRows(wb, name);
        const err = requireRows(rows, name);
        if (err) return { ok: false, error: err };
        const clients = parseClients(rows);
        return {
          ok: true,
          patch: { domain, clients, rowCounts: { clients: clients.length } },
        };
      }
      case "mercados": {
        const mName = findSheet(wb, ["Mercados", "mercados", "Markets"])!;
        const cName =
          findSheet(wb, ["Competidores", "competidores", "Competitors"]) ?? mName;
        const oName =
          findSheet(wb, ["Oportunidades", "oportunidades", "Opportunities"]) ??
          mName;
        const markets = parseMarkets(sheetToRows(wb, mName));
        const competitors = parseCompetitors(sheetToRows(wb, cName));
        const opportunities = parseOpportunities(sheetToRows(wb, oName));
        if (!markets.length && !competitors.length && !opportunities.length) {
          return {
            ok: false,
            error: "No se encontraron filas en Mercados / Competidores / Oportunidades.",
          };
        }
        return {
          ok: true,
          patch: {
            domain,
            markets,
            competitors,
            opportunities,
            rowCounts: {
              markets: markets.length,
              competitors: competitors.length,
              opportunities: opportunities.length,
            },
          },
        };
      }
      default:
        return { ok: false, error: "Dominio Excel no reconocido." };
    }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Error al parsear el Excel.",
    };
  }
}

function inventoryToAoA(rows: InventorySku[]): unknown[][] {
  const maxD = Math.max(7, ...rows.map((r) => r.monthlyDemand.length));
  const header = [
    "skuCode",
    "title",
    "category",
    "onHand",
    "avgCost",
    ...Array.from({ length: maxD }, (_, i) => `d${i + 1}`),
  ];
  const body = rows.map((r) => [
    r.skuCode,
    r.title,
    r.category,
    r.onHand,
    r.avgCost,
    ...Array.from({ length: maxD }, (_, i) => r.monthlyDemand[i] ?? ""),
  ]);
  return [header, ...body];
}

/** Genera un libro .xlsx (ArrayBuffer) para una plantilla demo. */
export function buildDemoWorkbook(domain: ExcelDomainId): ArrayBuffer {
  const wb = XLSX.utils.book_new();

  const add = (name: string, aoa: unknown[][]) => {
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    XLSX.utils.book_append_sheet(wb, ws, name);
  };

  switch (domain) {
    case "compras":
      add("Compras", [
        ["id", "poDate", "vendor", "skuCode", "qty", "unitCost", "total"],
        ...templatePurchases.map((r) => [
          r.id,
          r.poDate,
          r.vendor,
          r.skuCode,
          r.qty,
          r.unitCost,
          r.total,
        ]),
      ]);
      break;
    case "ventas":
      add("Ventas", [
        [
          "id",
          "invoiceDate",
          "customerCode",
          "customerName",
          "skuCode",
          "qty",
          "unitPrice",
          "ulc",
          "total",
        ],
        ...templateSales.map((r) => [
          r.id,
          r.invoiceDate,
          r.customerCode,
          r.customerName,
          r.skuCode,
          r.qty,
          r.unitPrice,
          r.ulc,
          r.total,
        ]),
      ]);
      break;
    case "margenes":
      add("Márgenes", [
        ["skuCode", "title", "sales", "marginPct"],
        ...templateMargins.map((r) => [r.skuCode, r.title, r.sales, r.marginPct]),
      ]);
      break;
    case "gastos":
      add("Gastos", [
        ["id", "month", "category", "label", "amount"],
        ...templateExpenses.map((r) => [
          r.id,
          r.month,
          r.category,
          r.label,
          r.amount,
        ]),
      ]);
      break;
    case "nomina":
      add("Nómina", [
        ["id", "month", "role", "headcount", "gross"],
        ...templatePayroll.map((r) => [
          r.id,
          r.month,
          r.role,
          r.headcount,
          r.gross,
        ]),
      ]);
      break;
    case "inventario":
      add("Inventario", inventoryToAoA(templateInventory));
      break;
    case "demanda":
      add("Demanda", inventoryToAoA(templateDemanda));
      break;
    case "clientes":
      add("Clientes", [
        [
          "code",
          "legalName",
          "tier",
          "lastOrderDate",
          "trailing12mSales",
          "status",
          "inactiveReason",
        ],
        ...templateClients.map((r) => [
          r.code,
          r.legalName,
          r.tier,
          r.lastOrderDate ?? "",
          r.trailing12mSales,
          r.status,
          r.inactiveReason ?? "",
        ]),
      ]);
      break;
    case "mercados":
      add("Mercados", [
        ["id", "market", "segment", "growthPct", "note"],
        ...templateMarkets.map((r) => [
          r.id,
          r.market,
          r.segment,
          r.growthPct,
          r.note,
        ]),
      ]);
      add("Competidores", [
        ["id", "name", "focus", "priceIndex", "strength", "weakness"],
        ...templateCompetitors.map((r) => [
          r.id,
          r.name,
          r.focus,
          r.priceIndex,
          r.strength,
          r.weakness,
        ]),
      ]);
      add("Oportunidades", [
        [
          "id",
          "skuCode",
          "title",
          "ourPrice",
          "competitorAvg",
          "gapPct",
          "action",
        ],
        ...templateOpportunities.map((r) => [
          r.id,
          r.skuCode,
          r.title,
          r.ourPrice,
          r.competitorAvg,
          r.gapPct,
          r.action,
        ]),
      ]);
      break;
  }

  return XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
}

export function assertTemplateRowCounts(): void {
  const checks: [string, number][] = [
    ["compras", templatePurchases.length],
    ["ventas", templateSales.length],
    ["margenes", templateMargins.length],
    ["gastos", templateExpenses.length],
    ["nomina", templatePayroll.length],
    ["inventario", templateInventory.length],
    ["demanda", templateDemanda.length],
    ["clientes", templateClients.length],
    ["mercados", templateMarkets.length],
    ["competidores", templateCompetitors.length],
    ["oportunidades", templateOpportunities.length],
  ];
  for (const [name, n] of checks) {
    if (n !== DEMO_ROW_COUNT) {
      throw new Error(`Plantilla ${name}: esperaba ${DEMO_ROW_COUNT} filas, hay ${n}`);
    }
  }
  for (const id of Object.keys(EXCEL_DOMAINS) as ExcelDomainId[]) {
    if (!EXCEL_DOMAINS[id].href.startsWith("/intel-demo/")) {
      throw new Error(`href inválido para ${id}`);
    }
  }
}
