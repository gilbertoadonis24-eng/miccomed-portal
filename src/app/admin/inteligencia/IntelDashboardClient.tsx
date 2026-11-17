"use client";

import { useState } from "react";
import type {
  IntelDashboardSnapshot,
  IntelSectionId,
} from "@/lib/intel/types";

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
  data,
  initialSection = "overview",
}: {
  data: IntelDashboardSnapshot;
  initialSection?: IntelSectionId;
}) {
  const [section, setSection] = useState<IntelSectionId>(initialSection);

  return (
    <div className="intel">
      <header className="intel-hero">
        <div className="intel-hero__glow" aria-hidden />
        <p className="intel-kicker">MiccoMed Miami · Inteligencia comercial</p>
        <h1>MiccoMed</h1>
        <p className="hero-copy muted">
          Tablero DEMO de mercados, compras, ventas, márgenes, gastos, rotación,
          clientes y alertas de reposición. Datos 100% ficticios.
        </p>
        <div className="intel-hero__actions">
          <span className="badge">DEMO seed</span>
          <span className="muted" style={{ fontSize: "0.9rem" }}>
            {data.periodLabel}
          </span>
          <button type="button" className="btn secondary" disabled title="Fase 2">
            Importar Excel
          </button>
        </div>
        <p className="muted intel-stub-hint">
          «Importar Excel» queda como stub para la fase 2 (carga de data real).
        </p>
      </header>

      <nav className="intel-tabs" aria-label="Secciones del tablero">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            className={section === s.id ? "intel-tab intel-tab--active" : "intel-tab"}
            onClick={() => setSection(s.id)}
          >
            {s.label}
            {s.id === "reposicion" && data.overview.replenishmentAlerts > 0 ? (
              <span className="intel-tab__count">{data.overview.replenishmentAlerts}</span>
            ) : null}
          </button>
        ))}
      </nav>

      {section === "overview" && <Overview data={data} onJump={setSection} />}
      {section === "markets" && <Markets data={data} />}
      {section === "compras" && <Compras data={data} />}
      {section === "ventas" && <Ventas data={data} />}
      {section === "margenes" && <Margenes data={data} />}
      {section === "gastos" && <Gastos data={data} />}
      {section === "rotacion" && <Rotacion data={data} />}
      {section === "clientes" && <Clientes data={data} />}
      {section === "reposicion" && <Reposicion data={data} />}
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
      <p className="muted">KPIs del período DEMO — un vistazo para priorizar acciones.</p>
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

function Markets({ data }: { data: IntelDashboardSnapshot }) {
  return (
    <section className="intel-section">
      <h2>Mercados, competencia y precios</h2>
      <p className="muted">Señales DEMO para priorizar share y pricing B2B.</p>

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

function Compras({ data }: { data: IntelDashboardSnapshot }) {
  return (
    <section className="intel-section">
      <h2>Compras</h2>
      <p className="muted">Órdenes de compra DEMO y tendencia mensual.</p>
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

function Ventas({ data }: { data: IntelDashboardSnapshot }) {
  return (
    <section className="intel-section">
      <h2>Ventas</h2>
      <p className="muted">Facturas DEMO y curva mensual.</p>
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

function Margenes({ data }: { data: IntelDashboardSnapshot }) {
  return (
    <section className="intel-section">
      <h2>Márgenes</h2>
      <p className="muted">
        Margen bruto por SKU sobre ventas DEMO (precio − ULC). Piso global DEMO 25%.
      </p>
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

function Gastos({ data }: { data: IntelDashboardSnapshot }) {
  return (
    <section className="intel-section">
      <h2>Gastos y nómina</h2>
      <p className="muted">OpEx y headcount DEMO del período.</p>
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

function Rotacion({ data }: { data: IntelDashboardSnapshot }) {
  return (
    <section className="intel-section">
      <h2>Rotación de inventario</h2>
      <p className="muted">
        Turns ≈ COGS anualizado / inventario on-hand (costo). Cobertura usa demanda media.
      </p>
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

function Clientes({ data }: { data: IntelDashboardSnapshot }) {
  const activos = data.clients.filter((c) => c.status === "activo");
  const inactivos = data.clients.filter((c) => c.status === "inactivo");
  return (
    <section className="intel-section">
      <h2>Clientes</h2>
      <p className="muted">
        {activos.length} activos · {inactivos.length} inactivos (DEMO).
      </p>
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

function Reposicion({ data }: { data: IntelDashboardSnapshot }) {
  return (
    <section className="intel-section">
      <h2>Alertas de reposición</h2>
      <p className="muted">
        Regla: con ≥6 meses de demanda histórica, si el on-hand cubre ≤3 meses,
        sugerir qty = demanda_promedio×3 − stock.
      </p>
      {data.replenishment.length === 0 ? (
        <p className="ok">Sin alertas en el seed DEMO.</p>
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
