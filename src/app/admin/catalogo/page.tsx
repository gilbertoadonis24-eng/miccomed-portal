import { redirect } from "next/navigation";
import { AppChrome } from "@/components/AppChrome";
import { getServerSession } from "@/lib/session-server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminCatalogoPage() {
  const session = await getServerSession();
  if (!session || session.plane !== "internal") redirect("/");
  const canCost =
    session.role === "INTERNAL_ADMIN" || session.permissions.includes("view_cost");
  const skus = await sql(
    `select s.sku_code, s.title, c.slug as category, s.active, s.is_demo,
            (select ulc::text from ulc_record u where u.sku_id = s.id
             order by effective_from desc limit 1) as ulc
     from sku s join category c on c.id = s.category_id order by s.sku_code`,
  );
  return (
    <AppChrome session={session}>
      <section className="panel">
        <h1>Catálogo interno</h1>
        <table>
          <thead>
            <tr>
              <th>SKU</th>
              <th>Título</th>
              <th>Cat.</th>
              {canCost && <th>ULC</th>}
            </tr>
          </thead>
          <tbody>
            {skus.map((s) => (
              <tr key={String(s.sku_code)}>
                <td>
                  {String(s.sku_code)} {s.is_demo ? <span className="badge">DEMO</span> : null}
                </td>
                <td>{String(s.title)}</td>
                <td>{String(s.category)}</td>
                {canCost && <td>{String(s.ulc ?? "—")}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </AppChrome>
  );
}
