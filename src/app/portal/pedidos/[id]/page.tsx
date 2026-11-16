import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { AppChrome } from "@/components/AppChrome";
import { getServerSession } from "@/lib/session-server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function PedidoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession();
  if (!session || session.plane !== "client") redirect("/");
  const { id } = await params;
  const orders = await sql(
    `select * from sales_order where id = $1 and customer_id = $2`,
    [id, session.customerId],
  );
  if (!orders[0]) notFound();
  const lines = await sql(
    `select line_no, description, uom, qty_ordered::text, qty_shipped::text,
            qty_backorder::text, unit_price::text, price_source
     from sales_order_line where sales_order_id = $1 order by line_no`,
    [id],
  );
  const shipments = await sql(
    `select id, shipment_number, status from shipment where sales_order_id = $1 and customer_id = $2`,
    [id, session.customerId],
  );

  return (
    <AppChrome session={session}>
      <section className="panel">
        <h1>{String(orders[0].order_number)}</h1>
        <p className="muted">Estado: {String(orders[0].status)}</p>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Descripción</th>
              <th>Qty</th>
              <th>Precio</th>
              <th>Fuente</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={String(l.line_no)}>
                <td>{String(l.line_no)}</td>
                <td>{String(l.description)}</td>
                <td>
                  {String(l.qty_ordered)} / ship {String(l.qty_shipped)} / BO{" "}
                  {String(l.qty_backorder)}
                </td>
                <td>${String(l.unit_price)}</td>
                <td>{String(l.price_source)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <h2>Entregas</h2>
        <ul>
          {shipments.map((s) => (
            <li key={String(s.id)}>
              <Link href={`/portal/entregas/${s.id}`}>{String(s.shipment_number)}</Link> ·{" "}
              {String(s.status)}
            </li>
          ))}
        </ul>
      </section>
    </AppChrome>
  );
}
