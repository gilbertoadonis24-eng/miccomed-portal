import Link from "next/link";
import { redirect } from "next/navigation";
import { AppChrome } from "@/components/AppChrome";
import { getServerSession } from "@/lib/session-server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function EstadoCuentaPage() {
  const session = await getServerSession();
  if (!session || session.plane !== "client") redirect("/");
  const invoices = await sql(
    `select id, invoice_number, status, due_date::text, total::text, amount_paid::text,
            greatest(total - amount_paid,0)::text as balance,
            case when total - amount_paid <= 0 then 0
                 when due_date >= current_date then 0
                 else (current_date - due_date) end::int as days_past_due
     from invoice
     where customer_id = $1 and status in ('ISSUED','PARTIALLY_PAID','PAID')
     order by due_date`,
    [session.customerId],
  );
  return (
    <AppChrome session={session}>
      <section className="panel">
        <h1>Estado de cuenta</h1>
        <p className="muted">Cuentas por pagar del cliente · días de mora calculados al leer.</p>
        <table>
          <thead>
            <tr>
              <th>Factura</th>
              <th>Vence</th>
              <th>Saldo</th>
              <th>Mora</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((i) => (
              <tr key={String(i.id)}>
                <td>
                  <Link href={`/portal/facturas/${i.id}`}>{String(i.invoice_number)}</Link>
                </td>
                <td>{String(i.due_date)}</td>
                <td>${String(i.balance)}</td>
                <td className={Number(i.days_past_due) > 0 ? "danger" : ""}>
                  {String(i.days_past_due)}d
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </AppChrome>
  );
}
