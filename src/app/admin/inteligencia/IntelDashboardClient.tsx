"use client";

import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { buildIntelDashboard } from "@/lib/intel/build";
import {
  EXCEL_DOMAINS,
  type ExcelDomainId,
} from "@/lib/intel/excel-domains";
import { parseIntelExcel } from "@/lib/intel/excel";
import type { IntelSourceData } from "@/lib/intel/sources";
import type {
  IntelDashboardSnapshot,
  IntelSectionId,
} from "@/lib/intel/types";
import { ExcelSectionActions } from "./ExcelSectionActions";

const SECTIONS: { id: IntelSectionId; label: string }[] = [
  { id: "overview", label: "Resumen" },
  { id: "markets", label: "Mercados" },
  { id: "compras", label: "Compras" },
  { id: "ventas", label: "Ventas" },
  { id: "margenes", label: "Márgenes" },
  { id: "gastos", label: "Gastos / nómina" },
  { id: "rotacion", label: "Rotación" },
  { id: "clientes", label: "Clientes" },
  { id: "reposicion", label: "Reposición" },
];

/** Dominios Excel asociados a cada sección (gastos tiene dos). */
const SECTION_DOMAINS: Partial<Record<IntelSectionId, ExcelDomainId[]>> = {
  markets: ["mercados"],
  compras: ["compras"],
  ventas: ["ventas"],
  margenes: ["margenes"],
  gastos: ["gastos", "nomina"],
  rotacion: ["inventario"],
  clientes: ["clientes"],
  reposicion: ["demanda"],
};

function usd(n: number): string {
  return new Intl.NumberFormat("es-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function usd2(n: number): string {
  return new Intl.NumberFormat("es-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function pct(n: number): string {
  return `${n.toFixed(1)}%`;
}

export function IntelDashboardClient({
  data: initialData,
  initialSection = "overview",
}: {
  data: IntelDashboardSnapshot;
  initialSection?: IntelSectionId;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [section, setSection] = useState<IntelSectionId>(initialSection);
  const [overrides, setOverrides] = useState<Partial<IntelSourceData>>({});
  const [loadedDomains, setLoadedDomains] = useState<Partial<Record<ExcelDomainId, true>>>(
    {},
  );
  const [busyDomain, setBusyDomain] = useState<ExcelDomainId | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  const data = useMemo(() => {
    if (Object.keys(overrides).length === 0) return initialData;
    return buildIntelDashboard(overrides);
  }, [initialData, overrides]);

  function goToSection(id: IntelSectionId) {
    setSection(id);
    const qs = id === "overview" ? "" : `?seccion=${id}`;
    router.replace(`${pathname}${qs}`, { scroll: false });
  }

  async function handleLoad(domain: ExcelDomainId, file: File) {
    setBusyDomain(domain);
    setBanner(null);
    try {
      const buf = await file.arrayBuffer();
      const result = parseIntelExcel(domain, buf);
      if (!result.ok) {
        setBanner(result.error);
        return;
      }
      const { domain: _d, rowCounts, ...patch } = result.patch;
      setOverrides((prev) => ({ ...prev, ...patch }));
      setLoadedDomains((prev) => ({ ...prev, [domain]: true }));
      const counts = Object.entries(rowCounts)
        .map(([k, n]) => `${n} ${k}`)
        .join(" · ");
      setBanner(
        `Cargado «${EXCEL_DOMAINS[domain].label}» desde ${file.name} (${counts}). Seed DEMO permanece en el resto.`,
      );
    } finally {
      setBusyDomain(null);
    }
  }

  function handleReset(domain: ExcelDomainId) {
    setLoadedDomains((prev) => {
      const next = { ...prev };
      delete next[domain];
      const siblingStillLoaded =
        (domain === "inventario" && next.demanda) ||
        (domain === "demanda" && next.inventario);
      setOverrides((prevOv) => {
        const ov = { ...prevOv };
        for (const k of EXCEL_DOMAINS[domain].sourceKeys) {
          if (k === "inventory" && siblingStillLoaded) continue;
          delete ov[k as keyof IntelSourceData];
        }
        return ov;
      });
      return next;
    });
    setBanner(`Restaurado seed DEMO para «${EXCEL_DOMAINS[domain].label}».`);
  }

  function domainBars(domains: ExcelDomainId[] | undefined) {
    if (!domains?.length) return null;
    return (
      <div className="intel-excel-stack">
        {domains.map((d) => (
          <ExcelSectionActions
            key={d}
            domain={d}
            loaded={Boolean(loadedDomains[d])}
            busy={busyDomain === d}
            onLoadedFile={handleLoad}
            onReset={handleReset}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="intel">
      <header className="intel-hero">
        <div className="intel-hero__glow" aria-hidden />
        <p className="intel-kicker">MiccoMed Miami · Inteligencia comercial</p>
        <h1>MiccoMed</h1>
        <p className="hero-copy muted">
          Tablero DEMO de mercados, compras, ventas, márgenes, gastos, rotación,
          clientes y alertas de reposición. Descarga la plantilla Excel de cada
          sección, cárgala y verifica el refresco; sin archivo se usa el seed DEMO.
        </p>
        <div className="intel-hero__actions">
          <span className="badge">
            {data.loadedFromExcel ? "DEMO + Excel" : "DEMO seed"}
          </span>
          <span className="muted" style={{ fontSize: "0.9rem" }}>
            {data.periodLabel}
          </span>
        </div>
        {banner ? <p className="intel-banner ok">{banner}</p> : null}
      </header>

      <nav className="intel-tabs" aria-label="Secciones del tablero">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            className={section === s.id ? "intel-tab intel-tab--active" : "intel-tab"}
            onClick={() => goToSection(s.id)}
          >
            {s.label}
            {s.id === "reposicion" && data.overview.replenishmentAlerts > 0 ? (
              <span className="intel-tab__count">{data.overview.replenishmentAlerts}</span>
            ) : null}
          </button>
        ))}
      </nav>

      {section === "overview" && <Overview data={data} onJump={goToSection} />}
      {section === "markets" && (
        <Markets data={data} excel={domainBars(SECTION_DOMAINS.markets)} />
      )}
      {section === "compras" && (
        <Compras data={data} excel={domainBars(SECTION_DOMAINS.compras)} />
      )}
      {section === "ventas" && (
        <Ventas data={data} excel={domainBars(SECTION_DOMAINS.ventas)} />
      )}
      {section === "margenes" && (
        <Margenes data={data} excel={domainBars(SECTION_DOMAINS.margenes)} />
      )}
      {section === "gastos" && (
        <Gastos data={data} excel={domainBars(SECTION_DOMAINS.gastos)} />
      )}
      {section === "rotacion" && (
        <Rotacion data={data} excel={domainBars(SECTION_DOMAINS.rotacion)} />
      )}
      {section === "clientes" && (
        <Clientes data={data} excel={domainBars(SECTION_DOMAINS.clientes)} />
      )}
      {section === "reposicion" && (
        <Reposicion data={data} excel={domainBars(SECTION_DOMAINS.reposicion)} />
      )}
    </div>
  );
}

function Overview({
  data,
  onJump,
}: {
  data: IntelDashboardSnapshot;
  onJump: (id: IntelSectionId) => void;
}) {
  const k = data.overview;
  return (
    <section className="intel-section">
      <h2>Resumen ejecutivo</h2>
      <p className="muted">
        KPIs del período DEMO — un vistazo para priorizar acciones. Carga Excel
        en cada sección para sustituir ese dominio.
      </p>
      <div className="intel-kpi-grid">
        <Kpi label="Ventas MTD" value={usd(k.salesMtd)} />
        <Kpi label="Ventas YTD" value={usd(k.salesYtd)} />
        <Kpi label="Compras MTD" value={usd(k.purchaseMtd)} />
        <Kpi label="Margen bruto" value={pct(k.grossMarginPct)} tone="ok" />
        <Kpi label="Gastos MTD" value={usd(k.expenseMtd)} />
        <Kpi label="Nómina MTD" value={usd(k.payrollMtd)} />
        <Kpi label="Clientes activos" value={String(k.activeClients)} />
        <Kpi label="Clientes inactivos" value={String(k.inactiveClients)} />
        <Kpi
          label="Alertas reposición"
          value={String(k.replenishmentAlerts)}
          tone={k.replenishmentAlerts > 0 ? "warn" : "ok"}
        />
        <Kpi label="Rotación media" value={`${k.inventoryTurns}×`} />
      </div>
      <div className="intel-jump">
        <button type="button" className="btn secondary" onClick={() => onJump("reposicion")}>
          Ver alertas de reposición
        </button>
        <button type="button" className="btn secondary" onClick={() => onJump("clientes")}>
          Ver clientes inactivos
        </button>
        <button type="button" className="btn secondary" onClick={() => onJump("compras")}>
          Probar carga Excel (compras)
        </button>
      </div>
    </section>
  );
}

function Kpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "ok" | "warn";
}) {
  return (
    <div className={`intel-kpi ${tone ? `intel-kpi--${tone}` : ""}`}>
      <div className="intel-kpi__label">{label}</div>
      <div className="intel-kpi__value">{value}</div>
    </div>
  );
}

function Markets({
  data,
  excel,
}: {
  data: IntelDashboardSnapshot;
  excel: ReactNode;
}) {
  return (
    <section className="intel-section">
      <h2>Mercados, competencia y precios</h2>
      <p className="muted">
        Señales DEMO para priorizar share y pricing B2B. Plantilla multi-hoja
        (Mercados · Competidores · Oportunidades), 10 filas c/u.
      </p>
      {excel}

      <h3>Mercados</h3>
      <table>
        <thead>
          <tr>
            <th>Mercado</th>
            <th>Segmento</th>
            <th>Crecimiento</th>
            <th>Nota</th>
          </tr>
        </thead>
        <tbody>
          {data.markets.map((m) => (
            <tr key={m.id}>
              <td>{m.market}</td>
              <td>{m.segment}</td>
              <td className="ok">{pct(m.growthPct)}</td>
              <td className="muted">{m.note}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Competidores</h3>
      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Foco</th>
            <th>Índice precio</th>
            <th>Fortaleza</th>
            <th>Debilidad</th>
          </tr>
        </thead>
        <tbody>
          {data.competitors.map((c) => (
            <tr key={c.id}>
              <td>{c.name}</td>
              <td>{c.focus}</td>
              <td>
                {c.priceIndex}
                <span className="muted"> (100 = paridad)</span>
              </td>
              <td>{c.strength}</td>
              <td className="muted">{c.weakness}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Oportunidades de precio</h3>
      <table>
        <thead>
          <tr>
            <th>SKU</th>
            <th>Nuestro</th>
            <th>Rival avg</th>
            <th>Gap</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          {data.opportunities.map((o) => (
            <tr key={o.id}>
              <td>
                <strong>{o.skuCode}</strong>
                <div className="muted">{o.title}</div>
              </td>
              <td>{usd2(o.ourPrice)}</td>
              <td>{usd2(o.competitorAvg)}</td>
              <td className={o.gapPct <= 0 ? "ok" : "danger"}>{pct(o.gapPct)}</td>
              <td>{o.action}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function Compras({
  data,
  excel,
}: {
  data: IntelDashboardSnapshot;
  excel: ReactNode;
}) {
  return (
    <section className="intel-section">
      <h2>Compras</h2>
      <p className="muted">Órdenes de compra y tendencia mensual (10 filas en plantilla).</p>
      {excel}
      <MiniBars points={data.purchasesByMonth} />
      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Vendor</th>
            <th>SKU</th>
            <th>Qty</th>
            <th>Costo u.</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {data.purchases.map((p) => (
            <tr key={p.id}>
              <td>{p.poDate}</td>
              <td>{p.vendor}</td>
              <td>{p.skuCode}</td>
              <td>{p.qty.toLocaleString("es-US")}</td>
              <td>{usd2(p.unitCost)}</td>
              <td>{usd(p.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function Ventas({
  data,
  excel,
}: {
  data: IntelDashboardSnapshot;
  excel: ReactNode;
}) {
  return (
    <section className="intel-section">
      <h2>Ventas</h2>
      <p className="muted">Facturas y curva mensual (plantilla 10 filas).</p>
      {excel}
      <MiniBars points={data.salesByMonth} accent />
      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Cliente</th>
            <th>SKU</th>
            <th>Qty</th>
            <th>Precio</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {data.sales.map((s) => (
            <tr key={s.id}>
              <td>{s.invoiceDate}</td>
              <td>
                {s.customerCode}
                <div className="muted">{s.customerName}</div>
              </td>
              <td>{s.skuCode}</td>
              <td>{s.qty.toLocaleString("es-US")}</td>
              <td>{usd2(s.unitPrice)}</td>
              <td>{usd(s.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function Margenes({
  data,
  excel,
}: {
  data: IntelDashboardSnapshot;
  excel: ReactNode;
}) {
  return (
    <section className="intel-section">
      <h2>Márgenes</h2>
      <p className="muted">
        Margen bruto por SKU. Sin Excel: derivado de ventas (precio − ULC). Con
        plantilla: 10 filas explícitas. Piso global DEMO 25%.
      </p>
      {excel}
      <table>
        <thead>
          <tr>
            <th>SKU</th>
            <th>Ventas</th>
            <th>Margen %</th>
          </tr>
        </thead>
        <tbody>
          {data.marginBySku.map((m) => (
            <tr key={m.skuCode}>
              <td>
                <strong>{m.skuCode}</strong>
                <div className="muted">{m.title}</div>
              </td>
              <td>{usd(m.sales)}</td>
              <td className={m.marginPct >= 25 ? "ok" : "danger"}>{pct(m.marginPct)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function Gastos({
  data,
  excel,
}: {
  data: IntelDashboardSnapshot;
  excel: ReactNode;
}) {
  return (
    <section className="intel-section">
      <h2>Gastos y nómina</h2>
      <p className="muted">OpEx y headcount del período — plantillas separadas (10 filas c/u).</p>
      {excel}
      <h3>Gastos</h3>
      <table>
        <thead>
          <tr>
            <th>Mes</th>
            <th>Categoría</th>
            <th>Concepto</th>
            <th>Monto</th>
          </tr>
        </thead>
        <tbody>
          {data.expenses.map((e) => (
            <tr key={e.id}>
              <td>{e.month}</td>
              <td>{e.category}</td>
              <td>{e.label}</td>
              <td>{usd(e.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3>Nómina</h3>
      <table>
        <thead>
          <tr>
            <th>Mes</th>
            <th>Rol</th>
            <th>Headcount</th>
            <th>Bruto</th>
          </tr>
        </thead>
        <tbody>
          {data.payroll.map((p) => (
            <tr key={p.id}>
              <td>{p.month}</td>
              <td>{p.role}</td>
              <td>{p.headcount}</td>
              <td>{usd(p.gross)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function Rotacion({
  data,
  excel,
}: {
  data: IntelDashboardSnapshot;
  excel: ReactNode;
}) {
  return (
    <section className="intel-section">
      <h2>Rotación de inventario</h2>
      <p className="muted">
        Turns ≈ COGS anualizado / inventario on-hand (costo). Plantilla con
        demanda mensual d1…dn (10 SKUs).
      </p>
      {excel}
      <table>
        <thead>
          <tr>
            <th>SKU</th>
            <th>Inv. avg $</th>
            <th>COGS 12m $</th>
            <th>Turns</th>
            <th>Cobertura</th>
            <th>Historia</th>
          </tr>
        </thead>
        <tbody>
          {data.inventoryTurns.map((r) => (
            <tr key={r.skuCode}>
              <td>
                <strong>{r.skuCode}</strong>
                <div className="muted">{r.title}</div>
              </td>
              <td>{usd(r.avgInventory)}</td>
              <td>{usd(r.cogsTrailing12m)}</td>
              <td>{r.turns}×</td>
              <td>
                {r.monthsOfCover === null ? "—" : `${r.monthsOfCover} m`}
              </td>
              <td>{r.historyMonths} m</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function Clientes({
  data,
  excel,
}: {
  data: IntelDashboardSnapshot;
  excel: ReactNode;
}) {
  const activos = data.clients.filter((c) => c.status === "activo");
  const inactivos = data.clients.filter((c) => c.status === "inactivo");
  return (
    <section className="intel-section">
      <h2>Clientes</h2>
      <p className="muted">
        {activos.length} activos · {inactivos.length} inactivos.
      </p>
      {excel}
      <h3>Activos</h3>
      <table>
        <thead>
          <tr>
            <th>Código</th>
            <th>Razón social</th>
            <th>Tier</th>
            <th>Último pedido</th>
            <th>Ventas 12m</th>
          </tr>
        </thead>
        <tbody>
          {activos.map((c) => (
            <tr key={c.code}>
              <td>{c.code}</td>
              <td>{c.legalName}</td>
              <td>{c.tier}</td>
              <td>{c.lastOrderDate ?? "—"}</td>
              <td>{usd(c.trailing12mSales)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3>Inactivos</h3>
      <table>
        <thead>
          <tr>
            <th>Código</th>
            <th>Razón social</th>
            <th>Último pedido</th>
            <th>Motivo</th>
          </tr>
        </thead>
        <tbody>
          {inactivos.map((c) => (
            <tr key={c.code}>
              <td>{c.code}</td>
              <td>{c.legalName}</td>
              <td>{c.lastOrderDate ?? "—"}</td>
              <td className="muted">{c.inactiveReason ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function Reposicion({
  data,
  excel,
}: {
  data: IntelDashboardSnapshot;
  excel: ReactNode;
}) {
  return (
    <section className="intel-section">
      <h2>Alertas de reposición</h2>
      <p className="muted">
        Regla: con ≥6 meses de demanda histórica, si el on-hand cubre ≤3 meses
        (borde exacto incluido), sugerir qty = demanda_promedio×3 − stock.
        Plantilla demanda.xlsx (10 SKUs).
      </p>
      {excel}
      {data.replenishment.length === 0 ? (
        <p className="ok">Sin alertas con la fuente actual.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>SKU</th>
              <th>On-hand</th>
              <th>Demanda/mes</th>
              <th>Cobertura</th>
              <th>Sugerido</th>
              <th>Motivo</th>
            </tr>
          </thead>
          <tbody>
            {data.replenishment.map((a) => (
              <tr key={a.skuCode}>
                <td>
                  <strong>{a.skuCode}</strong>
                  <div className="muted">{a.title}</div>
                </td>
                <td>{a.onHand.toLocaleString("es-US")}</td>
                <td>{a.avgMonthlyDemand.toLocaleString("es-US")}</td>
                <td className="danger">{a.monthsOfCover} m</td>
                <td className="ok">{a.suggestedQty.toLocaleString("es-US")}</td>
                <td className="muted">{a.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h3>Vigilancia de inventario (casos borde)</h3>
      <p className="muted">
        Incluye SKUs con historia corta o cobertura sana para validar que no disparen alerta.
      </p>
      <table>
        <thead>
          <tr>
            <th>SKU</th>
            <th>On-hand</th>
            <th>Meses hist.</th>
            <th>¿Alerta?</th>
          </tr>
        </thead>
        <tbody>
          {data.inventoryWatch.map((sku) => {
            const alert = data.replenishment.find((a) => a.skuCode === sku.skuCode);
            return (
              <tr key={sku.skuCode}>
                <td>
                  <strong>{sku.skuCode}</strong>
                  <div className="muted">{sku.title}</div>
                </td>
                <td>{sku.onHand.toLocaleString("es-US")}</td>
                <td>{sku.monthlyDemand.length}</td>
                <td className={alert ? "danger" : "ok"}>
                  {alert ? "Sí — reponer" : "No"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

function MiniBars({
  points,
  accent,
}: {
  points: { month: string; amount: number }[];
  accent?: boolean;
}) {
  const max = Math.max(...points.map((p) => p.amount), 1);
  return (
    <div className="intel-bars" role="img" aria-label="Serie mensual">
      {points.map((p) => (
        <div key={p.month} className="intel-bar">
          <div
            className={accent ? "intel-bar__fill intel-bar__fill--accent" : "intel-bar__fill"}
            style={{ height: `${Math.round((p.amount / max) * 100)}%` }}
          />
          <div className="intel-bar__label">{p.month.slice(5)}</div>
        </div>
      ))}
    </div>
  );
}
