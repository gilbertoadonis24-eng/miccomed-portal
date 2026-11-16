import Link from "next/link";
import { redirect } from "next/navigation";
import { AppChrome } from "@/components/AppChrome";
import { getServerSession } from "@/lib/session-server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function PedidosPage() {
  const session = await getServerSession();
  if (!session || session.plane !== "client") redirect("/");
  const orders = await sql(
    `select id, order_number, status, promised_date::text from sales_order
     where customer_id = $1 order by created_at desc`,
    [session.customerId],
  );
  return (
    <AppChrome session={session}>
      <section className="panel">
        <h1>Pedidos</h1>
        <table>
          <thead>
            <tr>
              <th>OV</th>
              <th>Estado</th>
              <th>Prometida</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={String(o.id)}>
                <td>
                  <Link href={`/portal/pedidos/${o.id}`}>{String(o.order_number)}</Link>
                </td>
                <td>{String(o.status)}</td>
                <td>{String(o.promised_date ?? "—")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </AppChrome>
  );
}
