"use client";

import { useEffect, useState } from "react";

type Quote = {
  id: string;
  quote_number: string;
  revision: number;
  status: string;
  valid_until: string | null;
};

export function QuotesClient() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [msg, setMsg] = useState("");

  async function load() {
    const data = await fetch("/api/client/quotes").then((r) => r.json());
    setQuotes(data.quotes ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function openQuote(id: string) {
    const data = await fetch(`/api/client/quotes/${id}`).then((r) => r.json());
    setDetail(data.quote ?? null);
  }

  async function accept(id: string) {
    const res = await fetch(`/api/client/quotes/${id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "accept" }),
    });
    const data = await res.json();
    setMsg(res.ok ? "Cotización aceptada (constancia autenticada)." : `Error: ${data.reason}`);
    await load();
    await openQuote(id);
  }

  return (
    <>
      <section className="panel">
        <h1>Cotizaciones</h1>
        <p className="muted">Aceptación autenticada = constancia (§8.8). PDF solo ES.</p>
      </section>
      <section className="panel">
        <table>
          <thead>
            <tr>
              <th>Número</th>
              <th>Estado</th>
              <th>Vigencia</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((q) => (
              <tr key={q.id}>
                <td>
                  {q.quote_number} r{q.revision}
                </td>
                <td>{q.status}</td>
                <td>{q.valid_until ?? "—"}</td>
                <td>
                  <button className="btn secondary" type="button" onClick={() => void openQuote(q.id)}>
                    Ver
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {detail && (
        <section className="panel">
          <h2>
            {String(detail.quote_number)} · {String(detail.status)}
          </h2>
          <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(detail.lines, null, 2)}</pre>
          {detail.status === "SENT" && (
            <button className="btn" type="button" onClick={() => void accept(String(detail.id))}>
              Aceptar esta revisión
            </button>
          )}
          {msg && <p className="ok">{msg}</p>}
        </section>
      )}
    </>
  );
}
