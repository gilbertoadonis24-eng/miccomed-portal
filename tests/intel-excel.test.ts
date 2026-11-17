import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildIntelDashboard } from "../src/lib/intel/build";
import {
  DEMO_ROW_COUNT,
  EXCEL_DOMAINS,
  type ExcelDomainId,
} from "../src/lib/intel/excel-domains";
import {
  assertTemplateRowCounts,
  buildDemoWorkbook,
  parseIntelExcel,
} from "../src/lib/intel/excel";
import { intelPurchases } from "../src/lib/intel/seed";

const PUBLIC = join(__dirname, "..", "public", "intel-demo");

describe("plantillas Excel demo", () => {
  it("tiene exactamente 10 filas por dominio en código", () => {
    expect(() => assertTemplateRowCounts()).not.toThrow();
  });

  it("round-trip generate → parse para cada dominio", () => {
    const domains = Object.keys(EXCEL_DOMAINS) as ExcelDomainId[];
    for (const domain of domains) {
      const buf = buildDemoWorkbook(domain);
      const result = parseIntelExcel(domain, buf);
      expect(result.ok, domain).toBe(true);
      if (!result.ok) continue;
      for (const [, n] of Object.entries(result.patch.rowCounts)) {
        expect(n, `${domain} rows`).toBe(DEMO_ROW_COUNT);
      }
    }
  });

  it("archivos en public/intel-demo parsean a 10 filas", () => {
    for (const meta of Object.values(EXCEL_DOMAINS)) {
      const buf = readFileSync(join(PUBLIC, meta.fileName));
      const result = parseIntelExcel(
        meta.id,
        buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
      );
      expect(result.ok, meta.fileName).toBe(true);
      if (!result.ok) continue;
      for (const n of Object.values(result.patch.rowCounts)) {
        expect(n).toBe(DEMO_ROW_COUNT);
      }
    }
  });

  it("build con override de compras sustituye seed y marca loadedFromExcel", () => {
    const buf = buildDemoWorkbook("compras");
    const parsed = parseIntelExcel("compras", buf);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const snap = buildIntelDashboard({ purchases: parsed.patch.purchases });
    expect(snap.loadedFromExcel).toBe(true);
    expect(snap.purchases).toHaveLength(DEMO_ROW_COUNT);
    expect(snap.purchases[0]?.id).not.toBe(intelPurchases[0]?.id);
    expect(snap.purchases.some((p) => p.vendor.includes("Excel Vendor"))).toBe(
      true,
    );
  });

  it("demanda Excel conserva historia corta (sin ceros fantasma)", () => {
    const buf = buildDemoWorkbook("demanda");
    const parsed = parseIntelExcel("demanda", buf);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok || !parsed.patch.inventory) return;
    const short = parsed.patch.inventory.find((s) => s.skuCode === "XLS-SKU-SHORT");
    expect(short?.monthlyDemand).toEqual([30, 28]);
    const glove = parsed.patch.inventory.find(
      (s) => s.skuCode === "OFF-GLOVE-NIT-M-DEMO",
    );
    expect(glove?.monthlyDemand).toHaveLength(3);
  });
});
