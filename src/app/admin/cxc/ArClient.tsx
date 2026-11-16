"use client";

import { useState } from "react";

type InvoiceRow = {
  id: string;
  invoice_number: string;
  customer_code: string;
  balance: string;
  days_past_due: number;
};

export function ArClient({ invoices }: { invoices: InvoiceRow[] }) {
  const [msg, setMsg] = useState("");

  async function pay(invoice: InvoiceRow) {
    const all = await fetch("/api/admin/customers").then((r) => r.json());
    const customer = (all.customers as { id: string; code: string }[]).find(
      (c) => c.code === invoice.customer_code,
    );
    if (!customer) {
      setMsg("customer_missing");
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
    setMsg(JSON.stringify(await res.json()));
  }

  const open = invoices.filter((i) => Number(i.balance) > 0);
  if (open.length === 0) return null;

  return (
    <section className="panel stack">
      <h2>Aplicar pagos</h2>
      <ul>
        {open.map((i) => (
          <li key={i.id} style={{ marginBottom: "0.5rem" }}>
            {i.invoice_number} · {i.customer_code} · ${i.balance} · mora {i.days_past_due}d{" "}
            <button className="btn" type="button" onClick={() => void pay(i)}>
              Aplicar pago
            </button>
          </li>
        ))}
      </ul>
      {msg && <pre>{msg}</pre>}
    </section>
  );
}
