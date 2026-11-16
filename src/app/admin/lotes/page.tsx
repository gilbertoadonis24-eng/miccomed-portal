import { redirect } from "next/navigation";
import { AppChrome } from "@/components/AppChrome";
import { getServerSession } from "@/lib/session-server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function LotesPage() {
  const session = await getServerSession();
  if (!session || session.plane !== "internal") redirect("/");
  const lots = await sql(
    `select s.sku_code, l.lot_code, l.expiry_date::text, lb.status,
            lb.qty_on_hand::text, lb.qty_reserved::text, l.is_demo
     from lot l
     join sku s on s.id = l.sku_id
     join lot_balance lb on lb.lot_id = l.id
     order by s.sku_code, l.lot_code`,
  );
  return (
    <AppChrome session={session}>
      <section className="panel">
        <h1>Libro de lotes</h1>
        <p className="muted">
          Default del plan: vacío. Este entorno incluye seed DEMO (§ entrega) para ATP/tests.
        </p>
        <table>
          <thead>
            <tr>
              <th>SKU</th>
              <th>Lote</th>
              <th>Estado</th>
              <th>OH / Res</th>
              <th>Vence</th>
            </tr>
          </thead>
          <tbody>
            {lots.map((l, i) => (
              <tr key={i}>
                <td>
                  {String(l.sku_code)} {l.is_demo ? <span className="badge">DEMO</span> : null}
                </td>
                <td>{String(l.lot_code)}</td>
                <td>{String(l.status)}</td>
                <td>
                  {String(l.qty_on_hand)} / {String(l.qty_reserved)}
                </td>
                <td>{String(l.expiry_date ?? "—")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </AppChrome>
  );
}
