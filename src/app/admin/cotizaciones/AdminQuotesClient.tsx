"use client";

import { useEffect, useState } from "react";

export function AdminQuotesClient({ canViewCost }: { canViewCost: boolean }) {
  const [quotes, setQuotes] = useState<Record<string, unknown>[]>([]);
  const [detail, setDetail] = useState<{ quote: Record<string, unknown>; lines: Record<string, unknown>[] } | null>(null);
  const [msg, setMsg] = useState("");

  async function load() {
    const data = await fetch("/api/admin/quotes").then((r) => r.json());
    setQuotes(data.quotes ?? []);
  }
  useEffect(() => {
    void load();
  }, []);

  async function open(id: string) {
    const data = await fetch(`/api/admin/quotes/${id}`).then((r) => r.json());
    setDetail(data);
  }

  async function act(action: string, extra: Record<string, unknown> = {}) {
    if (!detail) return;
    const res = await fetch("/api/admin/quotes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ quoteId: detail.quote.id, action, ...extra }),
    });
    const data = await res.json();
    setMsg(JSON.stringify(data));
    await load();
    await open(String(detail.quote.id));
  }

  return (
    <>
      <section className="panel">
        <h1>Cotizaciones</h1>
        <table>
          <thead>
            <tr>
              <th>Número</th>
              <th>Cliente</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((q) => (
              <tr key={String(q.id)}>
                <td>
                  {String(q.quote_number)} r{String(q.revision)}
                </td>
                <td>{String(q.customer_code)}</td>
                <td>{String(q.status)}</td>
                <td>
                  <button className="btn secondary" type="button" onClick={() => void open(String(q.id))}>
                    Abrir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {detail && (
        <section className="panel stack">
          <h2>
            {String(detail.quote.quote_number)} · {String(detail.quote.status)}
          </h2>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Desc</th>
                <th>Precio</th>
                <th>Status</th>
                {canViewCost && <th>ULC / piso / margen</th>}
              </tr>
            </thead>
            <tbody>
              {detail.lines.map((l) => (
                <tr key={String(l.id)}>
                  <td>{String(l.line_no)}</td>
                  <td>{String(l.description)}</td>
                  <td>{String(l.unit_price)}</td>
                  <td>{String(l.line_status)}</td>
                  {canViewCost && (
                    <td>
                      {String(l.ulc ?? "—")} / {String(l.floor_price ?? "—")} /{" "}
                      {String(l.margin_pct ?? "—")}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button className="btn" type="button" onClick={() => void act("send")}>
              Enviar (congelar)
            </button>
            <button
              className="btn secondary"
              type="button"
              onClick={() =>
                void act("convert", { acceptBackorder: true, customerPoNumber: "PO-DEMO-1" })
              }
            >
              Convertir a OV
            </button>
            {detail.lines[0] && (
              <button
                className="btn secondary"
                type="button"
                onClick={() =>
                  void act("margin_override", {
                    lineId: detail.lines[0].id,
                    reason: "DEMO override bajo piso",
                    authorizedPrice: Number(detail.lines[0].unit_price),
                  })
                }
              >
                Override margen (línea 1)
              </button>
            )}
          </div>
          {msg && <pre>{msg}</pre>}
        </section>
      )}
    </>
  );
}
