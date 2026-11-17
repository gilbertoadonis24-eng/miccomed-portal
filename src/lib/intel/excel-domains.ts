/**
 * Dominios Excel demo: plantillas de exactamente 10 filas de datos + parsers.
 * Español en encabezados de hoja para la UX.
 */
import type { MarginSkuRow } from "./sources";
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

/** Dominios descargables / cargables (no incluye overview). */
export type ExcelDomainId =
  | "compras"
  | "ventas"
  | "margenes"
  | "gastos"
  | "nomina"
  | "inventario"
  | "demanda"
  | "clientes"
  | "mercados";

export type ExcelDomainMeta = {
  id: ExcelDomainId;
  label: string;
  /** Ruta pública bajo /public */
  href: string;
  fileName: string;
  /** Qué clave(s) de source actualiza al parsear */
  sourceKeys: Array<
    | "purchases"
    | "sales"
    | "margins"
    | "expenses"
    | "payroll"
    | "inventory"
    | "clients"
    | "markets"
    | "competitors"
    | "opportunities"
  >;
};

export const EXCEL_DOMAINS: Record<ExcelDomainId, ExcelDomainMeta> = {
  compras: {
    id: "compras",
    label: "Compras",
    href: "/intel-demo/compras.xlsx",
    fileName: "compras.xlsx",
    sourceKeys: ["purchases"],
  },
  ventas: {
    id: "ventas",
    label: "Ventas",
    href: "/intel-demo/ventas.xlsx",
    fileName: "ventas.xlsx",
    sourceKeys: ["sales"],
  },
  margenes: {
    id: "margenes",
    label: "Márgenes",
    href: "/intel-demo/margenes.xlsx",
    fileName: "margenes.xlsx",
    sourceKeys: ["margins"],
  },
  gastos: {
    id: "gastos",
    label: "Gastos",
    href: "/intel-demo/gastos.xlsx",
    fileName: "gastos.xlsx",
    sourceKeys: ["expenses"],
  },
  nomina: {
    id: "nomina",
    label: "Nómina",
    href: "/intel-demo/nomina.xlsx",
    fileName: "nomina.xlsx",
    sourceKeys: ["payroll"],
  },
  inventario: {
    id: "inventario",
    label: "Inventario / rotación",
    href: "/intel-demo/inventario.xlsx",
    fileName: "inventario.xlsx",
    sourceKeys: ["inventory"],
  },
  demanda: {
    id: "demanda",
    label: "Demanda / reposición",
    href: "/intel-demo/demanda.xlsx",
    fileName: "demanda.xlsx",
    sourceKeys: ["inventory"],
  },
  clientes: {
    id: "clientes",
    label: "Clientes",
    href: "/intel-demo/clientes.xlsx",
    fileName: "clientes.xlsx",
    sourceKeys: ["clients"],
  },
  mercados: {
    id: "mercados",
    label: "Mercados",
    href: "/intel-demo/mercados.xlsx",
    fileName: "mercados.xlsx",
    sourceKeys: ["markets", "competitors", "opportunities"],
  },
};

export const DEMO_ROW_COUNT = 10;

/** Filas demo (exactamente 10) — también alimentan la generación de .xlsx */
export const templatePurchases: PurchaseRow[] = [
  { id: "xpo-01", poDate: "2025-11-01", vendor: "AsiaPack DEMO Co.", skuCode: "BOT-PET-AMB-MR-8-24", qty: 5000, unitCost: 0.93, total: 4650 },
  { id: "xpo-02", poDate: "2025-11-02", vendor: "ClosureWorks DEMO", skuCode: "CAP-PP-CRC-WHT-24-FOAM-HIC", qty: 8000, unitCost: 0.36, total: 2880 },
  { id: "xpo-03", poDate: "2025-11-03", vendor: "DeviceOEM DEMO", skuCode: "DEV-PULSEOX-DEMO-01", qty: 200, unitCost: 11.4, total: 2280 },
  { id: "xpo-04", poDate: "2025-11-04", vendor: "OfficeMed DEMO", skuCode: "OFF-GLOVE-NIT-M-DEMO", qty: 25, unitCost: 41, total: 1025 },
  { id: "xpo-05", poDate: "2025-11-05", vendor: "CartonFlex DEMO", skuCode: "BOX-SHIP-MD-DEMO", qty: 1500, unitCost: 0.54, total: 810 },
  { id: "xpo-06", poDate: "2025-10-06", vendor: "AsiaPack DEMO Co.", skuCode: "BOT-PET-AMB-MR-8-24", qty: 6000, unitCost: 0.92, total: 5520 },
  { id: "xpo-07", poDate: "2025-10-07", vendor: "ClosureWorks DEMO", skuCode: "CAP-PP-CRC-WHT-24-FOAM-HIC", qty: 9000, unitCost: 0.35, total: 3150 },
  { id: "xpo-08", poDate: "2025-10-08", vendor: "PackInsert DEMO", skuCode: "CARTON-INSERT-NEW-DEMO", qty: 4000, unitCost: 0.21, total: 840 },
  { id: "xpo-09", poDate: "2025-09-09", vendor: "DeviceOEM DEMO", skuCode: "DEV-PULSEOX-DEMO-01", qty: 150, unitCost: 11.1, total: 1665 },
  { id: "xpo-10", poDate: "2025-09-10", vendor: "Excel Vendor Sur DEMO", skuCode: "BOX-SHIP-MD-DEMO", qty: 2200, unitCost: 0.56, total: 1232 },
];

export const templateSales: SalesRow[] = [
  { id: "xinv-01", invoiceDate: "2025-11-01", customerCode: "DEMO-NORTE", customerName: "Farmacia Norte Demo LLC", skuCode: "BOT-PET-AMB-MR-8-24", qty: 2000, unitPrice: 1.82, ulc: 1.0, total: 3640 },
  { id: "xinv-02", invoiceDate: "2025-11-02", customerCode: "DEMO-SUR", customerName: "Clinica Sur Demo Inc", skuCode: "CAP-PP-CRC-WHT-24-FOAM-HIC", qty: 3000, unitPrice: 0.72, ulc: 0.4, total: 2160 },
  { id: "xinv-03", invoiceDate: "2025-11-03", customerCode: "DEMO-ESTE", customerName: "Farmacia Este Demo PA", skuCode: "DEV-PULSEOX-DEMO-01", qty: 40, unitPrice: 23, ulc: 12, total: 920 },
  { id: "xinv-04", invoiceDate: "2025-11-04", customerCode: "DEMO-OESTE", customerName: "Distribuidora Oeste Demo", skuCode: "OFF-GLOVE-NIT-M-DEMO", qty: 8, unitPrice: 70, ulc: 42, total: 560 },
  { id: "xinv-05", invoiceDate: "2025-11-05", customerCode: "DEMO-NORTE", customerName: "Farmacia Norte Demo LLC", skuCode: "BOX-SHIP-MD-DEMO", qty: 500, unitPrice: 1.1, ulc: 0.55, total: 550 },
  { id: "xinv-06", invoiceDate: "2025-10-06", customerCode: "DEMO-SUR", customerName: "Clinica Sur Demo Inc", skuCode: "BOT-PET-AMB-MR-8-24", qty: 1800, unitPrice: 1.75, ulc: 1.0, total: 3150 },
  { id: "xinv-07", invoiceDate: "2025-10-07", customerCode: "DEMO-ESTE", customerName: "Farmacia Este Demo PA", skuCode: "CAP-PP-CRC-WHT-24-FOAM-HIC", qty: 2200, unitPrice: 0.7, ulc: 0.4, total: 1540 },
  { id: "xinv-08", invoiceDate: "2025-10-08", customerCode: "DEMO-OESTE", customerName: "Distribuidora Oeste Demo", skuCode: "DEV-PULSEOX-DEMO-01", qty: 55, unitPrice: 24, ulc: 12, total: 1320 },
  { id: "xinv-09", invoiceDate: "2025-09-09", customerCode: "DEMO-NORTE", customerName: "Farmacia Norte Demo LLC", skuCode: "CARTON-INSERT-NEW-DEMO", qty: 900, unitPrice: 0.45, ulc: 0.22, total: 405 },
  { id: "xinv-10", invoiceDate: "2025-09-10", customerCode: "XLS-NUEVO", customerName: "Cliente Excel Nuevo DEMO", skuCode: "BOT-PET-AMB-MR-8-24", qty: 1200, unitPrice: 1.9, ulc: 1.0, total: 2280 },
];

export const templateMargins: MarginSkuRow[] = [
  { skuCode: "BOT-PET-AMB-MR-8-24", title: "Frasco PET ámbar 8 oz", sales: 9070, marginPct: 44.5 },
  { skuCode: "CAP-PP-CRC-WHT-24-FOAM-HIC", title: "Tapa CRC 24 mm", sales: 3700, marginPct: 42.1 },
  { skuCode: "DEV-PULSEOX-DEMO-01", title: "Pulsioxímetro dedo DEMO", sales: 2240, marginPct: 48.0 },
  { skuCode: "OFF-GLOVE-NIT-M-DEMO", title: "Guantes nitrilo M DEMO", sales: 560, marginPct: 40.0 },
  { skuCode: "BOX-SHIP-MD-DEMO", title: "Caja envío mediana DEMO", sales: 550, marginPct: 50.0 },
  { skuCode: "CARTON-INSERT-NEW-DEMO", title: "Inserto carton DEMO", sales: 405, marginPct: 51.1 },
  { skuCode: "XLS-SKU-07", title: "Kit consultorio DEMO", sales: 3100, marginPct: 33.2 },
  { skuCode: "XLS-SKU-08", title: "Bolsa esteril DEMO", sales: 1800, marginPct: 28.5 },
  { skuCode: "XLS-SKU-09", title: "Etiqueta CRC DEMO", sales: 920, marginPct: 55.0 },
  { skuCode: "XLS-SKU-10", title: "Termómetro IR DEMO", sales: 1450, marginPct: 37.8 },
];

export const templateExpenses: ExpenseRow[] = [
  { id: "xexp-01", month: "2025-11", category: "Instalaciones", label: "Almacén Miami (Excel)", amount: 4900 },
  { id: "xexp-02", month: "2025-11", category: "Flota", label: "Combustible Excel", amount: 1310 },
  { id: "xexp-03", month: "2025-11", category: "Seguros", label: "Responsabilidad Excel", amount: 910 },
  { id: "xexp-04", month: "2025-11", category: "Utilidades", label: "Energía Excel", amount: 670 },
  { id: "xexp-05", month: "2025-11", category: "Marketing", label: "Feria B2B DEMO", amount: 2400 },
  { id: "xexp-06", month: "2025-10", category: "Instalaciones", label: "Almacén Miami (Excel)", amount: 4900 },
  { id: "xexp-07", month: "2025-10", category: "Flete inbound", label: "Contenedor AsiaPack Excel", amount: 2250 },
  { id: "xexp-08", month: "2025-10", category: "TI", label: "SaaS portal DEMO", amount: 380 },
  { id: "xexp-09", month: "2025-09", category: "Legal", label: "Compliance FDA DEMO", amount: 1500 },
  { id: "xexp-10", month: "2025-09", category: "Capacitación", label: "FEFO almacén DEMO", amount: 620 },
];

export const templatePayroll: PayrollRow[] = [
  { id: "xpay-01", month: "2025-11", role: "Almacén / picking", headcount: 4, gross: 15100 },
  { id: "xpay-02", month: "2025-11", role: "Ventas B2B", headcount: 2, gross: 11400 },
  { id: "xpay-03", month: "2025-11", role: "Ops / admin", headcount: 2, gross: 9900 },
  { id: "xpay-04", month: "2025-11", role: "QA / compliance", headcount: 1, gross: 6200 },
  { id: "xpay-05", month: "2025-10", role: "Almacén / picking", headcount: 4, gross: 14900 },
  { id: "xpay-06", month: "2025-10", role: "Ventas B2B", headcount: 2, gross: 11100 },
  { id: "xpay-07", month: "2025-10", role: "Ops / admin", headcount: 2, gross: 9750 },
  { id: "xpay-08", month: "2025-10", role: "QA / compliance", headcount: 1, gross: 6100 },
  { id: "xpay-09", month: "2025-09", role: "Almacén / picking", headcount: 3, gross: 11200 },
  { id: "xpay-10", month: "2025-09", role: "Ventas B2B", headcount: 2, gross: 10800 },
];

/** Inventario / demanda: 10 SKUs con columnas d1…d7 (meses de demanda). */
export const templateInventory: InventorySku[] = [
  {
    skuCode: "BOT-PET-AMB-MR-8-24",
    title: "Frasco PET ámbar 8 oz (Excel)",
    category: "Empaque — frascos",
    onHand: 4000,
    monthlyDemand: [2000, 2100, 2200, 2300, 2400, 2200, 2500],
    avgCost: 0.93,
    lots: [{ lot: "XL-BOT-1", qty: 4000, expiry: null }],
  },
  {
    skuCode: "CAP-PP-CRC-WHT-24-FOAM-HIC",
    title: "Tapa CRC 24 mm (Excel)",
    category: "Empaque — tapas",
    onHand: 4800,
    monthlyDemand: [2500, 2600, 2700, 2800, 2900, 3000, 3100],
    avgCost: 0.36,
    lots: [{ lot: "XL-CAP-1", qty: 4800, expiry: null }],
  },
  {
    skuCode: "DEV-PULSEOX-DEMO-01",
    title: "Pulsioxímetro (Excel)",
    category: "Dispositivos",
    onHand: 500,
    monthlyDemand: [50, 55, 60, 65, 70, 75, 70],
    avgCost: 11.5,
    lots: [{ lot: "XL-PX-1", qty: 500, expiry: "2027-06-01" }],
  },
  {
    skuCode: "OFF-GLOVE-NIT-M-DEMO",
    title: "Guantes nitrilo M (Excel)",
    category: "Consultorio",
    onHand: 10,
    monthlyDemand: [10, 12, 14],
    avgCost: 42,
    lots: [{ lot: "XL-GLV-1", qty: 10, expiry: "2026-12-01" }],
  },
  {
    skuCode: "BOX-SHIP-MD-DEMO",
    title: "Caja envío mediana (Excel)",
    category: "Empaque — cajas",
    onHand: 850,
    monthlyDemand: [380, 400, 390, 410, 420, 400],
    avgCost: 0.55,
    lots: [{ lot: "XL-BOX-1", qty: 850, expiry: null }],
  },
  {
    skuCode: "CARTON-INSERT-NEW-DEMO",
    title: "Inserto carton (Excel)",
    category: "Empaque — cajas",
    onHand: 100,
    monthlyDemand: [70, 80, 90],
    avgCost: 0.22,
    lots: [{ lot: "XL-INS-1", qty: 100, expiry: null }],
  },
  {
    skuCode: "XLS-SKU-LOW",
    title: "Kit bajo stock (Excel)",
    category: "Kits",
    onHand: 90,
    monthlyDemand: [40, 42, 38, 41, 39, 40],
    avgCost: 8.5,
    lots: [{ lot: "XL-KIT-1", qty: 90, expiry: null }],
  },
  {
    skuCode: "XLS-SKU-OK",
    title: "Termómetro OK cover (Excel)",
    category: "Dispositivos",
    onHand: 400,
    monthlyDemand: [40, 42, 38, 41, 39, 40, 45],
    avgCost: 15,
    lots: [{ lot: "XL-TH-1", qty: 400, expiry: "2028-01-01" }],
  },
  {
    skuCode: "XLS-SKU-EDGE",
    title: "SKU borde 3m exactos (Excel)",
    category: "Empaque",
    onHand: 300,
    monthlyDemand: [100, 100, 100, 100, 100, 100],
    avgCost: 1.2,
    lots: [{ lot: "XL-ED-1", qty: 300, expiry: null }],
  },
  {
    skuCode: "XLS-SKU-SHORT",
    title: "Historia corta (Excel)",
    category: "Nuevos",
    onHand: 20,
    monthlyDemand: [30, 28],
    avgCost: 3.1,
    lots: [{ lot: "XL-SH-1", qty: 20, expiry: null }],
  },
];

/** Misma forma que inventario; plantilla de reposición enfatiza demanda. */
export const templateDemanda: InventorySku[] = templateInventory.map((row, i) => ({
  ...row,
  title: row.title.replace("(Excel)", "(Demanda Excel)"),
  // Pequeña variación para que la carga de demanda se note vs inventario
  onHand: Math.max(0, row.onHand - i * 5),
}));

export const templateClients: ClientRow[] = [
  { code: "DEMO-NORTE", legalName: "Farmacia Norte Demo LLC", tier: "TIER_A", lastOrderDate: "2025-11-04", trailing12mSales: 43000, status: "activo" },
  { code: "DEMO-SUR", legalName: "Clinica Sur Demo Inc", tier: "TIER_B", lastOrderDate: "2025-11-07", trailing12mSales: 19000, status: "activo" },
  { code: "DEMO-ESTE", legalName: "Farmacia Este Demo PA", tier: "TIER_B", lastOrderDate: "2025-11-10", trailing12mSales: 13000, status: "activo" },
  { code: "DEMO-OESTE", legalName: "Distribuidora Oeste Demo", tier: "TIER_A", lastOrderDate: "2025-10-22", trailing12mSales: 29500, status: "activo" },
  { code: "XLS-NUEVO", legalName: "Cliente Excel Nuevo DEMO", tier: "TIER_B", lastOrderDate: "2025-09-10", trailing12mSales: 2280, status: "activo" },
  { code: "XLS-CLINIC", legalName: "Clínica Excel Metro DEMO", tier: "TIER_A", lastOrderDate: "2025-11-01", trailing12mSales: 15600, status: "activo" },
  { code: "DEMO-INACT", legalName: "Laboratorio Inactivo Demo", tier: "LIST", lastOrderDate: "2025-06-02", trailing12mSales: 340, status: "inactivo", inactiveReason: "Sin pedidos > 120 días (Excel)" },
  { code: "DEMO-DORM", legalName: "Clínica Dormida Demo LLC", tier: "TIER_B", lastOrderDate: "2025-02-18", trailing12mSales: 0, status: "inactivo", inactiveReason: "Cuenta dormida (Excel)" },
  { code: "XLS-INACT-A", legalName: "Lab Excel Inactivo A", tier: "LIST", lastOrderDate: "2025-03-01", trailing12mSales: 120, status: "inactivo", inactiveReason: "Crédito vencido DEMO" },
  { code: "XLS-INACT-B", legalName: "Dist Excel Inactivo B", tier: "TIER_B", lastOrderDate: null, trailing12mSales: 0, status: "inactivo", inactiveReason: "Nunca compró — lead frío" },
];

export const templateMarkets: MarketSignal[] = [
  { id: "xmkt-01", market: "Miami metro", segment: "Empaque farmacéutico", growthPct: 6.5, note: "Excel: lead times Asia +2 sem." },
  { id: "xmkt-02", market: "Florida Sur", segment: "Dispositivos consultorio", growthPct: 3.4, note: "Excel: preferencia 510(k)." },
  { id: "xmkt-03", market: "Caribe reexport", segment: "Empaque + suministros", growthPct: 8.8, note: "Excel: CRC + origen limpio." },
  { id: "xmkt-04", market: "Tampa Bay", segment: "Guantes / consultorio", growthPct: 4.1, note: "Excel: tenders hospitalarios." },
  { id: "xmkt-05", market: "Orlando", segment: "Kits clínicos", growthPct: 5.2, note: "Excel: crecimiento ambulatory." },
  { id: "xmkt-06", market: "Jacksonville", segment: "Cartones", growthPct: 2.8, note: "Excel: stock local rival." },
  { id: "xmkt-07", market: "Puerto Rico", segment: "Dispositivos", growthPct: 7.0, note: "Excel: documentación FDA." },
  { id: "xmkt-08", market: "Rep. Dominicana", segment: "Empaque PET", growthPct: 9.1, note: "Excel: oportunidad CASE." },
  { id: "xmkt-09", market: "Panamá hub", segment: "Reexport LatAm", growthPct: 6.0, note: "Excel: logística consolidada." },
  { id: "xmkt-10", market: "Atlanta spillover", segment: "Distribución SE", growthPct: 3.9, note: "Excel: precio index 102." },
];

export const templateCompetitors: CompetitorRow[] = [
  { id: "xcomp-01", name: "Rival Empaque Sur DEMO", focus: "Frascos PET / CRC", priceIndex: 93, strength: "Precio CASE", weakness: "Lead time" },
  { id: "xcomp-02", name: "MedSupply Atlántico DEMO", focus: "Dispositivos + guantes", priceIndex: 109, strength: "Marca clínicas", weakness: "Servicio lento" },
  { id: "xcomp-03", name: "PackLine Caribe DEMO", focus: "Cartones", priceIndex: 100, strength: "Stock local", weakness: "Catálogo estrecho" },
  { id: "xcomp-04", name: "GloveMax SE DEMO", focus: "Guantes nitrilo", priceIndex: 96, strength: "Volumen", weakness: "Poca trazabilidad" },
  { id: "xcomp-05", name: "Oxipro Med DEMO", focus: "Oximetría", priceIndex: 112, strength: "Marketing", weakness: "ULC alto" },
  { id: "xcomp-06", name: "CartonFast DEMO", focus: "Cajas shipper", priceIndex: 98, strength: "Entrega 48h", weakness: "Calidad variable" },
  { id: "xcomp-07", name: "CRC Direct DEMO", focus: "Tapas CRC", priceIndex: 91, strength: "Precio", weakness: "Sin bundle" },
  { id: "xcomp-08", name: "ClinicKit Pro DEMO", focus: "Kits", priceIndex: 105, strength: "Assortment", weakness: "MOQ alto" },
  { id: "xcomp-09", name: "LatAm Pack Hub DEMO", focus: "Reexport", priceIndex: 97, strength: "Red regional", weakness: "Docs incompletos" },
  { id: "xcomp-10", name: "Excel Rival Nuevo DEMO", focus: "Multi-categoría", priceIndex: 101, strength: "Promo Q4", weakness: "Sin FEFO" },
];

export const templateOpportunities: PriceOpportunity[] = [
  { id: "xopp-01", skuCode: "BOT-PET-AMB-MR-8-24", title: "Frasco PET ámbar 8 oz", ourPrice: 1.82, competitorAvg: 1.95, gapPct: -6.7, action: "Excel: mantener Tier A" },
  { id: "xopp-02", skuCode: "CAP-PP-CRC-WHT-24-FOAM-HIC", title: "Tapa CRC 24 mm", ourPrice: 0.72, competitorAvg: 0.68, gapPct: 5.9, action: "Excel: revisar ULC / bundle" },
  { id: "xopp-03", skuCode: "DEV-PULSEOX-DEMO-01", title: "Pulsioxímetro", ourPrice: 23, competitorAvg: 26.5, gapPct: -13.2, action: "Excel: empujar share" },
  { id: "xopp-04", skuCode: "OFF-GLOVE-NIT-M-DEMO", title: "Guantes nitrilo M", ourPrice: 70, competitorAvg: 66, gapPct: 6.1, action: "Excel: promo CASE" },
  { id: "xopp-05", skuCode: "BOX-SHIP-MD-DEMO", title: "Caja mediana", ourPrice: 1.1, competitorAvg: 1.05, gapPct: 4.8, action: "Excel: match rival local" },
  { id: "xopp-06", skuCode: "CARTON-INSERT-NEW-DEMO", title: "Inserto carton", ourPrice: 0.45, competitorAvg: 0.5, gapPct: -10.0, action: "Excel: destacar lead time" },
  { id: "xopp-07", skuCode: "XLS-SKU-07", title: "Kit consultorio", ourPrice: 48, competitorAvg: 52, gapPct: -7.7, action: "Excel: bundle con guantes" },
  { id: "xopp-08", skuCode: "XLS-SKU-08", title: "Bolsa esteril", ourPrice: 2.1, competitorAvg: 2.0, gapPct: 5.0, action: "Excel: negociar ULC" },
  { id: "xopp-09", skuCode: "XLS-SKU-09", title: "Etiqueta CRC", ourPrice: 0.18, competitorAvg: 0.22, gapPct: -18.2, action: "Excel: volumen Tier B" },
  { id: "xopp-10", skuCode: "XLS-SKU-10", title: "Termómetro IR", ourPrice: 19, competitorAvg: 21, gapPct: -9.5, action: "Excel: demo clínica" },
];
