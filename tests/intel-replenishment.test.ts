import { describe, expect, it } from "vitest";
import { buildIntelDashboard } from "../src/lib/intel/build";
import {
  buildReplenishmentAlerts,
  evaluateCover,
  MAX_COVER_MONTHS_BEFORE_REPLENISH,
  MIN_DEMAND_HISTORY_MONTHS,
} from "../src/lib/intel/replenishment";
import { intelInventory } from "../src/lib/intel/seed";

describe("evaluateCover / reposición", () => {
  it("no sugiere sin ≥6 meses de historia aunque el stock esté bajo", () => {
    const m = evaluateCover(5, [20, 22, 18]);
    expect(m.monthsOfHistory).toBeLessThan(MIN_DEMAND_HISTORY_MONTHS);
    expect(m.eligible).toBe(false);
    expect(m.needsReplenishment).toBe(false);
    expect(m.suggestedQty).toBe(0);
  });

  it("sugiere cuando hay ≥6m y cobertura ≤3m", () => {
    const demand = [100, 100, 100, 100, 100, 100];
    const onHand = 250; // 2.5 meses
    const m = evaluateCover(onHand, demand);
    expect(m.eligible).toBe(true);
    expect(m.monthsOfCover).toBeLessThanOrEqual(MAX_COVER_MONTHS_BEFORE_REPLENISH);
    expect(m.needsReplenishment).toBe(true);
    expect(m.suggestedQty).toBe(50); // 300 - 250
  });

  it("no sugiere con cobertura >3m aunque haya historia", () => {
    const demand = [50, 50, 50, 50, 50, 50];
    const m = evaluateCover(200, demand); // 4 meses
    expect(m.needsReplenishment).toBe(false);
    expect(m.suggestedQty).toBe(0);
  });
});

describe("seed DEMO inteligencia", () => {
  it("incluye alertas y casos sin alerta", () => {
    const alerts = buildReplenishmentAlerts(intelInventory);
    const codes = alerts.map((a) => a.skuCode);
    expect(codes).toContain("BOT-PET-AMB-MR-8-24");
    expect(codes).toContain("CAP-PP-CRC-WHT-24-FOAM-HIC");
    expect(codes).toContain("BOX-SHIP-MD-DEMO");
    expect(codes).not.toContain("DEV-PULSEOX-DEMO-01");
    expect(codes).not.toContain("OFF-GLOVE-NIT-M-DEMO");
    expect(codes).not.toContain("CARTON-INSERT-NEW-DEMO");
  });

  it("el snapshot cubre todas las áreas KPI V1", () => {
    const snap = buildIntelDashboard();
    expect(snap.isDemo).toBe(true);
    expect(snap.markets.length).toBeGreaterThan(0);
    expect(snap.competitors.length).toBeGreaterThan(0);
    expect(snap.opportunities.length).toBeGreaterThan(0);
    expect(snap.purchases.length).toBeGreaterThan(0);
    expect(snap.sales.length).toBeGreaterThan(0);
    expect(snap.marginBySku.length).toBeGreaterThan(0);
    expect(snap.expenses.length).toBeGreaterThan(0);
    expect(snap.payroll.length).toBeGreaterThan(0);
    expect(snap.inventoryTurns.length).toBeGreaterThan(0);
    expect(snap.clients.some((c) => c.status === "activo")).toBe(true);
    expect(snap.clients.some((c) => c.status === "inactivo")).toBe(true);
    expect(snap.replenishment.length).toBeGreaterThan(0);
    expect(snap.overview.replenishmentAlerts).toBe(snap.replenishment.length);
  });
});
