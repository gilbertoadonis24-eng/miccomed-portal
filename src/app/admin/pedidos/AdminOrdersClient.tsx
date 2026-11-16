"use client";

import { useEffect, useState } from "react";

export function AdminOrdersClient() {
  const [orders, setOrders] = useState<Record<string, unknown>[]>([]);
  const [msg, setMsg] = useState("");

  async function load() {
    const data = await fetch("/api/admin/orders").then((r) => r.json());
    setOrders(data.orders ?? []);
  }
  useEffect(() => {
    void load();
  }, []);

  async function act(orderId: string, action: string, extra: Record<string, unknown> = {}) {
    const res = await fetch("/api/admin/orders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orderId, action, ...extra }),
    });
    setMsg(JSON.stringify(await res.json()));
    await load();
  }

  return (
    <section className="panel stack">
      <h1>Pedidos</h1>
      <table>
        <thead>
          <tr>
            <th>OV</th>
            <th>Cliente</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={String(o.id)}>
              <td>{String(o.order_number)}</td>
              <td>{String(o.customer_code)}</td>
              <td>{String(o.status)}</td>
              <td style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                <button className="btn secondary" type="button" onClick={() => void act(String(o.id), "confirm")}>
                  Confirmar
                </button>
                <button
                  className="btn secondary"
                  type="button"
                  onClick={() =>
                    void act(String(o.id), "release_hold", { reason: "Liberación DEMO admin" })
                  }
                >
                  Liberar hold
                </button>
                <button
                  className="btn"
                  type="button"
                  onClick={() =>
                    void act(String(o.id), "ship", {
                      receiverName: "Receptor DEMO",
                      note: "POD mínimo MVP",
                    })
                  }
                >
                  Despachar+factura
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {msg && <pre>{msg}</pre>}
    </section>
  );
}
