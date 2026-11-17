/**
 * Seed DEMO 100% ficticio para inteligencia comercial V1.
 * No son precios, clientes ni volúmenes reales de MiccoMed.
 */
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

export const INTEL_PERIOD_LABEL = "Nov 2025 — demo YTD";

export const intelMarkets: MarketSignal[] = [
  {
    id: "mkt-miami-pkg",
    market: "Miami metro",
    segment: "Empaque farmacéutico (PET ámbar / CRC)",
    growthPct: 6.2,
    note: "Demanda estable de frascos 8 oz; lead times Asia alargados 2–3 semanas.",
  },
  {
    id: "mkt-fl-devices",
    market: "Florida Sur",
    segment: "Dispositivos de consultorio (oximetría)",
    growthPct: 3.1,
    note: "Compras institucionales más selectivas; preferencia por 510(k) verificable.",
  },
  {
    id: "mkt-carib",
    market: "Caribe / LatAm reexport",
    segment: "Empaque + suministros",
    growthPct: 8.4,
    note: "Oportunidad en cajas y tapas CRC; requiere documentación de origen limpia.",
  },
];

export const intelCompetitors: CompetitorRow[] = [
  {
    id: "comp-a",
    name: "Rival Empaque Sur DEMO",
    focus: "Frascos PET y tapas CRC",
    priceIndex: 94,
    strength: "Precio agresivo en CASE",
    weakness: "Lead time irregular; poca trazabilidad de lote",
  },
  {
    id: "comp-b",
    name: "MedSupply Atlántico DEMO",
    focus: "Dispositivos + guantes",
    priceIndex: 108,
    strength: "Marca conocida en clínicas",
    weakness: "Márgenes altos; servicio lento en Miami metro",
  },
  {
    id: "comp-c",
    name: "PackLine Caribe DEMO",
    focus: "Cartones y empaque secundario",
    priceIndex: 101,
    strength: "Stock local de cajas",
    weakness: "Catálogo estrecho de dispositivos",
  },
];

export const intelOpportunities: PriceOpportunity[] = [
  {
    id: "opp-1",
    skuCode: "BOT-PET-AMB-MR-8-24",
    title: "Frasco PET ámbar 8 oz",
    ourPrice: 1.8,
    competitorAvg: 1.95,
    gapPct: -7.7,
    action: "Mantener precio Tier A; empujar CASE a cuentas TIER_B.",
  },
  {
    id: "opp-2",
    skuCode: "CAP-PP-CRC-WHT-24-FOAM-HIC",
    title: "Tapa CRC 24 mm",
    ourPrice: 0.75,
    competitorAvg: 0.68,
    gapPct: 10.3,
    action: "Revisar ULC o bundle frasco+tapa para cerrar gap.",
  },
  {
    id: "opp-3",
    skuCode: "DEV-PULSEOX-DEMO-01",
    title: "Pulsioxímetro dedo",
    ourPrice: 24,
    competitorAvg: 26.5,
    gapPct: -9.4,
    action: "Oportunidad de share vs MedSupply; destacar 510(k) DEMO.",
  },
];

export const intelPurchases: PurchaseRow[] = [
  {
    id: "po-2510-01",
    poDate: "2025-10-03",
    vendor: "AsiaPack DEMO Co.",
    skuCode: "BOT-PET-AMB-MR-8-24",
    qty: 12000,
    unitCost: 0.92,
    total: 11040,
  },
  {
    id: "po-2510-02",
    poDate: "2025-10-08",
    vendor: "ClosureWorks DEMO",
    skuCode: "CAP-PP-CRC-WHT-24-FOAM-HIC",
    qty: 20000,
    unitCost: 0.35,
    total: 7000,
  },
  {
    id: "po-2510-03",
    poDate: "2025-10-15",
    vendor: "DeviceOEM DEMO",
    skuCode: "DEV-PULSEOX-DEMO-01",
    qty: 400,
    unitCost: 11.2,
    total: 4480,
  },
  {
    id: "po-2511-01",
    poDate: "2025-11-02",
    vendor: "AsiaPack DEMO Co.",
    skuCode: "BOT-PET-AMB-MR-8-24",
    qty: 8000,
    unitCost: 0.94,
    total: 7520,
  },
  {
    id: "po-2511-02",
    poDate: "2025-11-05",
    vendor: "OfficeMed DEMO",
    skuCode: "OFF-GLOVE-NIT-M-DEMO",
    qty: 40,
    unitCost: 42,
    total: 1680,
  },
  {
    id: "po-2509-01",
    poDate: "2025-09-12",
    vendor: "CartonFlex DEMO",
    skuCode: "BOX-SHIP-MD-DEMO",
    qty: 3000,
    unitCost: 0.55,
    total: 1650,
  },
];

export const intelSales: SalesRow[] = [
  {
    id: "inv-n-101",
    invoiceDate: "2025-11-04",
    customerCode: "DEMO-NORTE",
    customerName: "Farmacia Norte Demo LLC",
    skuCode: "BOT-PET-AMB-MR-8-24",
    qty: 2500,
    unitPrice: 1.8,
    ulc: 1.0,
    total: 4500,
  },
  {
    id: "inv-n-102",
    invoiceDate: "2025-11-04",
    customerCode: "DEMO-NORTE",
    customerName: "Farmacia Norte Demo LLC",
    skuCode: "CAP-PP-CRC-WHT-24-FOAM-HIC",
    qty: 2500,
    unitPrice: 0.75,
    ulc: 0.4,
    total: 1875,
  },
  {
    id: "inv-s-88",
    invoiceDate: "2025-11-07",
    customerCode: "DEMO-SUR",
    customerName: "Clinica Sur Demo Inc",
    skuCode: "DEV-PULSEOX-DEMO-01",
    qty: 60,
    unitPrice: 22,
    ulc: 12,
    total: 1320,
  },
  {
    id: "inv-e-12",
    invoiceDate: "2025-11-10",
    customerCode: "DEMO-ESTE",
    customerName: "Farmacia Este Demo PA",
    skuCode: "BOT-PET-AMB-MR-8-24",
    qty: 1800,
    unitPrice: 1.55,
    ulc: 1.0,
    total: 2790,
  },
  {
    id: "inv-n-90",
    invoiceDate: "2025-10-18",
    customerCode: "DEMO-NORTE",
    customerName: "Farmacia Norte Demo LLC",
    skuCode: "BOT-PET-AMB-MR-8-24",
    qty: 3000,
    unitPrice: 1.8,
    ulc: 1.0,
    total: 5400,
  },
  {
    id: "inv-w-44",
    invoiceDate: "2025-10-22",
    customerCode: "DEMO-OESTE",
    customerName: "Distribuidora Oeste Demo",
    skuCode: "CAP-PP-CRC-WHT-24-FOAM-HIC",
    qty: 5000,
    unitPrice: 0.65,
    ulc: 0.4,
    total: 3250,
  },
  {
    id: "inv-n-70",
    invoiceDate: "2025-09-14",
    customerCode: "DEMO-NORTE",
    customerName: "Farmacia Norte Demo LLC",
    skuCode: "DEV-PULSEOX-DEMO-01",
    qty: 80,
    unitPrice: 24,
    ulc: 12,
    total: 1920,
  },
  {
    id: "inv-z-01",
    invoiceDate: "2025-06-02",
    customerCode: "DEMO-INACT",
    customerName: "Laboratorio Inactivo Demo",
    skuCode: "OFF-GLOVE-NIT-M-DEMO",
    qty: 5,
    unitPrice: 68,
    ulc: 42,
    total: 340,
  },
];

export const intelExpenses: ExpenseRow[] = [
  {
    id: "exp-2511-rent",
    month: "2025-11",
    category: "Instalaciones",
    label: "Almacén Miami (DEMO)",
    amount: 4800,
  },
  {
    id: "exp-2511-fleet",
    month: "2025-11",
    category: "Flota",
    label: "Combustible + mantenimiento",
    amount: 1260,
  },
  {
    id: "exp-2511-ins",
    month: "2025-11",
    category: "Seguros",
    label: "Responsabilidad + inventario",
    amount: 890,
  },
  {
    id: "exp-2511-util",
    month: "2025-11",
    category: "Utilidades",
    label: "Energía + telecom",
    amount: 640,
  },
  {
    id: "exp-2510-rent",
    month: "2025-10",
    category: "Instalaciones",
    label: "Almacén Miami (DEMO)",
    amount: 4800,
  },
  {
    id: "exp-2510-freight",
    month: "2025-10",
    category: "Flete inbound",
    label: "Contenedor AsiaPack",
    amount: 2100,
  },
];

export const intelPayroll: PayrollRow[] = [
  {
    id: "pay-2511-wh",
    month: "2025-11",
    role: "Almacén / picking",
    headcount: 4,
    gross: 14800,
  },
  {
    id: "pay-2511-sales",
    month: "2025-11",
    role: "Ventas B2B",
    headcount: 2,
    gross: 11200,
  },
  {
    id: "pay-2511-ops",
    month: "2025-11",
    role: "Ops / admin",
    headcount: 2,
    gross: 9800,
  },
  {
    id: "pay-2510-wh",
    month: "2025-10",
    role: "Almacén / picking",
    headcount: 4,
    gross: 14650,
  },
  {
    id: "pay-2510-sales",
    month: "2025-10",
    role: "Ventas B2B",
    headcount: 2,
    gross: 10900,
  },
];

/**
 * Inventario con casos de borde de reposición:
 * - BOT: ≥6m historia, cobertura ≤3m → alerta
 * - CAP: ≥6m historia, cobertura ≤3m → alerta
 * - DEV: ≥6m historia, cobertura >3m → sin alerta
 * - GLOVE: <6m historia + stock bajo → sin alerta (falta historia)
 * - BOX: ≥6m historia, cobertura justa ≤3m → alerta
 * - CARTON-NEW: 3m historia → sin alerta
 */
export const intelInventory: InventorySku[] = [
  {
    skuCode: "BOT-PET-AMB-MR-8-24",
    title: "Frasco PET ámbar 8 oz Modern Round 24 mm",
    category: "Empaque — frascos",
    onHand: 4200,
    // ~2200/mes → cobertura ~1.9m
    monthlyDemand: [1900, 2100, 2000, 2300, 2400, 2200, 2500],
    avgCost: 0.93,
    lots: [
      { lot: "L-BOT-2506", qty: 1800, expiry: null },
      { lot: "L-BOT-2510", qty: 2400, expiry: null },
    ],
  },
  {
    skuCode: "CAP-PP-CRC-WHT-24-FOAM-HIC",
    title: "Tapa CRC PP blanca 24 mm foam + HIC",
    category: "Empaque — tapas",
    onHand: 5100,
    // ~2800/mes → cobertura ~1.8m
    monthlyDemand: [2400, 2600, 2700, 2900, 3000, 2800, 3100],
    avgCost: 0.36,
    lots: [
      { lot: "L-CAP-2508", qty: 2100, expiry: null },
      { lot: "L-CAP-2510", qty: 3000, expiry: null },
    ],
  },
  {
    skuCode: "DEV-PULSEOX-DEMO-01",
    title: "Pulsioxímetro dedo DEMO",
    category: "Dispositivos",
    onHand: 520,
    // ~70/mes → cobertura ~7.4m → sin alerta
    monthlyDemand: [55, 60, 70, 65, 80, 75, 70],
    avgCost: 11.5,
    lots: [
      { lot: "L-PX-2503", qty: 200, expiry: "2027-03-01" },
      { lot: "L-PX-2509", qty: 320, expiry: "2027-09-15" },
    ],
  },
  {
    skuCode: "OFF-GLOVE-NIT-M-DEMO",
    title: "Guantes nitrilo M DEMO (CASE)",
    category: "Consultorio",
    onHand: 8,
    // Solo 3 meses de historia — no alerta aunque stock bajo
    monthlyDemand: [12, 15, 14],
    avgCost: 42,
    lots: [{ lot: "L-GLV-2510", qty: 8, expiry: "2026-10-01" }],
  },
  {
    skuCode: "BOX-SHIP-MD-DEMO",
    title: "Caja de envío mediana DEMO",
    category: "Empaque — cajas",
    onHand: 900,
    // ~400/mes → cobertura 2.25m → alerta
    monthlyDemand: [380, 410, 390, 420, 400, 430],
    avgCost: 0.55,
    lots: [{ lot: "L-BOX-2509", qty: 900, expiry: null }],
  },
  {
    skuCode: "CARTON-INSERT-NEW-DEMO",
    title: "Inserto carton nuevo DEMO",
    category: "Empaque — cajas",
    onHand: 120,
    // Historia corta
    monthlyDemand: [80, 90, 95],
    avgCost: 0.22,
    lots: [{ lot: "L-INS-2511", qty: 120, expiry: null }],
  },
];

export const intelClients: ClientRow[] = [
  {
    code: "DEMO-NORTE",
    legalName: "Farmacia Norte Demo LLC",
    tier: "TIER_A",
    lastOrderDate: "2025-11-04",
    trailing12mSales: 42800,
    status: "activo",
  },
  {
    code: "DEMO-SUR",
    legalName: "Clinica Sur Demo Inc",
    tier: "TIER_B",
    lastOrderDate: "2025-11-07",
    trailing12mSales: 18600,
    status: "activo",
  },
  {
    code: "DEMO-ESTE",
    legalName: "Farmacia Este Demo PA",
    tier: "TIER_B",
    lastOrderDate: "2025-11-10",
    trailing12mSales: 12400,
    status: "activo",
  },
  {
    code: "DEMO-OESTE",
    legalName: "Distribuidora Oeste Demo",
    tier: "TIER_A",
    lastOrderDate: "2025-10-22",
    trailing12mSales: 29100,
    status: "activo",
  },
  {
    code: "DEMO-INACT",
    legalName: "Laboratorio Inactivo Demo",
    tier: "LIST",
    lastOrderDate: "2025-06-02",
    trailing12mSales: 340,
    status: "inactivo",
    inactiveReason: "Sin pedidos > 120 días; crédito en revisión DEMO",
  },
  {
    code: "DEMO-DORM",
    legalName: "Clínica Dormida Demo LLC",
    tier: "TIER_B",
    lastOrderDate: "2025-02-18",
    trailing12mSales: 0,
    status: "inactivo",
    inactiveReason: "Cuenta dormida — outreach comercial pendiente",
  },
];
