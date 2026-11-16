"use client";

import { useEffect, useState } from "react";

type Item = {
  id: string;
  sku_code: string;
  title: string;
  category: string;
  uom: string;
  atp_qty: string;
  availability: string;
  cta: string;
  regulatory_note: string | null;
  price: { unit_price: string | null; price_source: string | null };
};

export function CatalogClient() {
  const [items, setItems] = useState<Item[]>([]);
  const [shipToId, setShipToId] = useState("");
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [msg, setMsg] = useState("");

  useEffect(() => {
    void (async () => {
      const [cat, acc] = await Promise.all([
        fetch("/api/client/catalog").then((r) => r.json()),
        fetch("/api/client/account").then((r) => r.json()),
      ]);
      setItems(cat.items ?? []);
      setShipToId(acc.ship_tos?.[0]?.id ?? "");
    })();
  }, []);

  async function submitRfq() {
    const lines = Object.entries(selected)
      .filter(([, qty]) => qty > 0)
      .map(([skuId, qty]) => {
        const item = items.find((i) => i.id === skuId)!;
        return { skuId, uom: item.uom as "EACH" | "CASE" | "PALLET", qty };
      });
    if (!shipToId || lines.length === 0) {
      setMsg("Elige cantidades y ship-to.");
      return;
    }
    const res = await fetch("/api/client/quotes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ shipToId, lines }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(`Error: ${data.error ?? res.status}`);
      return;
    }
    setMsg(`RFQ creada: ${data.quote.quote_number}`);
    setSelected({});
  }

  return (
    <>
      <section className="panel">
        <h1>Catálogo</h1>
        <p className="muted">
          Precio resuelto en servidor. Sin precio → “Solicitar cotización”. ATP solo AVAILABLE + dating.
        </p>
      </section>
      <section className="panel">
        <table>
          <thead>
            <tr>
              <th>SKU</th>
              <th>Título</th>
              <th>Precio</th>
              <th>ATP</th>
              <th>Qty</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  <strong>{item.sku_code}</strong>
                  <div className="muted">{item.category}</div>
                </td>
                <td>
                  {item.title}
                  {item.regulatory_note && (
                    <div className="muted">{item.regulatory_note}</div>
                  )}
                </td>
                <td>
                  {item.price.unit_price ? (
                    <>
                      ${item.price.unit_price}
                      <div className="muted">{item.price.price_source}</div>
                    </>
                  ) : (
                    <span className="badge">{item.cta}</span>
                  )}
                </td>
                <td>
                  {item.atp_qty}
                  <div className="muted">{item.availability}</div>
                </td>
                <td style={{ maxWidth: 90 }}>
                  <input
                    type="number"
                    min={0}
                    value={selected[item.id] ?? 0}
                    onChange={(e) =>
                      setSelected((s) => ({ ...s, [item.id]: Number(e.target.value) }))
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ marginTop: "1rem" }} className="stack">
          <button className="btn" type="button" onClick={() => void submitRfq()}>
            Crear RFQ con selección
          </button>
          {msg && <p className="ok">{msg}</p>}
        </div>
      </section>
    </>
  );
}
