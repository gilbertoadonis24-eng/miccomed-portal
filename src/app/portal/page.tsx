import Link from "next/link";
import { redirect } from "next/navigation";
import { AppChrome } from "@/components/AppChrome";
import { getServerSession } from "@/lib/session-server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function PortalHome() {
  const session = await getServerSession();
  if (!session || session.plane !== "client") redirect("/");

  const openOrders = await sql(
    `select order_number, status, promised_date::text
     from sales_order
     where customer_id = $1 and status not in ('DELIVERED','CANCELLED')
     order by created_at desc limit 5`,
    [session.customerId],
  );
  const dueSoon = await sql(
    `select invoice_number, due_date::text,
            greatest(total - amount_paid,0)::text as balance,
            case when total - amount_paid <= 0 then 0
                 when due_date >= current_date then 0
                 else (current_date - due_date) end::int as days_past_due
     from invoice
     where customer_id = $1 and status in ('ISSUED','PARTIALLY_PAID')
     order by due_date limit 5`,
    [session.customerId],
  );

  return (
    <AppChrome session={session}>
      <section className="panel">
        <h1>Inicio del cliente</h1>
        <p className="muted">Tenant fijado por sesión. No se acepta customer_id del navegador.</p>
      </section>
      <div className="grid">
        <section className="panel">
          <h2>Pedidos abiertos</h2>
          {openOrders.length === 0 ? (
            <p className="muted">Sin pedidos abiertos.</p>
          ) : (
            <ul>
              {openOrders.map((o) => (
                <li key={String(o.order_number)}>
                  {String(o.order_number)} · {String(o.status)} · prometida{" "}
                  {String(o.promised_date ?? "—")}
                </li>
              ))}
            </ul>
          )}
          <Link href="/portal/pedidos">Ver pedidos</Link>
        </section>
        <section className="panel">
          <h2>Facturas / mora</h2>
          {dueSoon.length === 0 ? (
            <p className="muted">Sin facturas abiertas.</p>
          ) : (
            <ul>
              {dueSoon.map((i) => (
                <li key={String(i.invoice_number)}>
                  {String(i.invoice_number)} · saldo {String(i.balance)} · mora{" "}
                  {String(i.days_past_due)}d
                </li>
              ))}
            </ul>
          )}
          <Link href="/portal/estado-de-cuenta">Estado de cuenta</Link>
        </section>
        <section className="panel">
          <h2>Nueva RFQ</h2>
          <p className="muted">Explora el catálogo con tu precio o solicita cotización.</p>
          <Link className="btn" href="/portal/catalogo">
            Ir al catálogo
          </Link>
        </section>
      </div>
    </AppChrome>
  );
}
