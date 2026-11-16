import { redirect } from "next/navigation";
import { AppChrome } from "@/components/AppChrome";
import { getServerSession } from "@/lib/session-server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ClientesPage() {
  const session = await getServerSession();
  if (!session || session.plane !== "internal") redirect("/");
  const customers = await sql(
    `select code, legal_name, tier, payment_terms, credit_limit::text, credit_status,
            min_shelf_life_days, is_demo, internal_ar_notes
     from customer order by code`,
  );
  return (
    <AppChrome session={session}>
      <section className="panel">
        <h1>Clientes</h1>
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Razón social</th>
              <th>Tier</th>
              <th>Crédito</th>
              <th>Notas AR</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={String(c.code)}>
                <td>
                  {String(c.code)} {c.is_demo ? <span className="badge">DEMO</span> : null}
                </td>
                <td>{String(c.legal_name)}</td>
                <td>{String(c.tier)}</td>
                <td>
                  {String(c.credit_status)} / ${String(c.credit_limit)}
                </td>
                <td className="muted">{String(c.internal_ar_notes ?? "")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </AppChrome>
  );
}
