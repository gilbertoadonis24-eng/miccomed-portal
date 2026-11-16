import { redirect } from "next/navigation";
import { AppChrome } from "@/components/AppChrome";
import { getServerSession } from "@/lib/session-server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function PreciosPage() {
  const session = await getServerSession();
  if (!session || session.plane !== "internal") redirect("/");
  if (session.role !== "INTERNAL_ADMIN" && !session.permissions.includes("view_cost")) {
    redirect("/admin");
  }
  const ulc = await sql(
    `select s.sku_code, u.ulc::text, u.effective_from::text, u.is_demo
     from ulc_record u join sku s on s.id = u.sku_id order by s.sku_code`,
  );
  const tiers = await sql(
    `select pl.tier, s.sku_code, pli.uom, pli.unit_price::text
     from price_list_item pli
     join price_list pl on pl.id = pli.price_list_id
     join sku s on s.id = pli.sku_id
     order by pl.tier, s.sku_code`,
  );
  return (
    <AppChrome session={session}>
      <section className="panel">
        <h1>ULC y precios</h1>
        <p className="muted">Requiere flag view_cost. El plano cliente no importa este módulo.</p>
        <h2>ULC</h2>
        <table>
          <thead>
            <tr>
              <th>SKU</th>
              <th>ULC</th>
              <th>Desde</th>
            </tr>
          </thead>
          <tbody>
            {ulc.map((u, i) => (
              <tr key={i}>
                <td>{String(u.sku_code)}</td>
                <td>{String(u.ulc)}</td>
                <td>{String(u.effective_from)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <h2>Tiers</h2>
        <table>
          <thead>
            <tr>
              <th>Tier</th>
              <th>SKU</th>
              <th>UOM</th>
              <th>Precio</th>
            </tr>
          </thead>
          <tbody>
            {tiers.map((t, i) => (
              <tr key={i}>
                <td>{String(t.tier)}</td>
                <td>{String(t.sku_code)}</td>
                <td>{String(t.uom)}</td>
                <td>{String(t.unit_price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </AppChrome>
  );
}
