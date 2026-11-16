"use client";

import { useEffect, useState } from "react";

export function ArClient() {
  const [invoices, setInvoices] = useState<Record<string, unknown>[]>([]);
  const [aging, setAging] = useState<Record<string, unknown> | null>(null);
  const [msg, setMsg] = useState("");

  async function load() {
    const data = await fetch("/api/admin/ar").then((r) => r.json());
    setInvoices(data.invoices ?? []);
    setAging(data.aging ?? null);
  }
  useEffect(() => {
    void load();
  }, []);

  return (
    <section className="panel stack">
      <h1>Cuentas por cobrar</h1>
      {aging && (
        <p className="muted">
          Aging: 1–30 {String(aging.b_1_30)} · 31–60 {String(aging.b_31_60)} · 61–90{" "}
          {String(aging.b_61_90)} · 90+ {String(aging.b_90_plus)}
        </p>
      )}
      <table>
        <thead>
          <tr>
            <th>Factura</th>
            <th>Cliente</th>
            <th>Saldo</th>
            <th>Mora</th>
            <th>Notas AR</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((i) => (
            <tr key={String(i.id)}>
              <td>
                {String(i.invoice_number)} {i.is_demo ? <span className="badge">DEMO</span> : null}
              </td>
              <td>{String(i.customer_code)}</td>
              <td>${String(i.balance)}</td>
              <td className={Number(i.days_past_due) > 0 ? "danger" : ""}>
                {String(i.days_past_due)}d
              </td>
              <td className="muted">{String(i.internal_ar_notes ?? "")}</td>
              <td>
                {Number(i.balance) > 0 && (
                  <PayButton invoice={i} onDone={(m) => { setMsg(m); void load(); }} />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {msg && <pre>{msg}</pre>}
    </section>
  );
}

function PayButton({
  invoice,
  onDone,
}: {
  invoice: Record<string, unknown>;
  onDone: (msg: string) => void;
}) {
  return (
    <button
      className="btn"
      type="button"
      onClick={() => {
        void (async () => {
          // Need customer_id — fetch invoice via admin list enrichment
          const all = await fetch("/api/admin/customers").then((r) => r.json());
          const customer = (all.customers as { id: string; code: string }[]).find(
            (c) => c.code === invoice.customer_code,
          );
          if (!customer) {
            onDone("customer_missing");
            return;
          }
          const res = await fetch("/api/admin/ar", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              action: "apply_payment",
              customerId: customer.id,
              invoiceId: invoice.id,
              amount: Number(invoice.balance),
              reference: "PAGO-DEMO",
            }),
          });
          onDone(JSON.stringify(await res.json()));
        })();
      }}
    >
      Aplicar pago
    </button>
  );
}
