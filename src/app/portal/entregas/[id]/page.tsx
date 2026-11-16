import { redirect, notFound } from "next/navigation";
import { AppChrome } from "@/components/AppChrome";
import { getServerSession } from "@/lib/session-server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function EntregaPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session || session.plane !== "client") redirect("/");
  const { id } = await params;
  const shipments = await sql(
    `select * from shipment where id = $1 and customer_id = $2`,
    [id, session.customerId],
  );
  if (!shipments[0]) notFound();
  const lines = await sql(
    `select qty::text, lot_code, expiry_date::text from shipment_line
     where shipment_id = $1 and customer_id = $2`,
    [id, session.customerId],
  );
  const pod = await sql(
    `select receiver_name, received_at::text, note from proof_of_delivery where shipment_id = $1`,
    [id],
  );
  return (
    <AppChrome session={session}>
      <section className="panel">
        <h1>Entrega {String(shipments[0].shipment_number)}</h1>
        <p className="muted">Lote visible solo en packing propio.</p>
        <table>
          <thead>
            <tr>
              <th>Qty</th>
              <th>Lote</th>
              <th>Vence</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, idx) => (
              <tr key={idx}>
                <td>{String(l.qty)}</td>
                <td>{String(l.lot_code)}</td>
                <td>{String(l.expiry_date ?? "—")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {pod[0] && (
          <p>
            POD: {String(pod[0].receiver_name)} · {String(pod[0].received_at)}
          </p>
        )}
      </section>
    </AppChrome>
  );
}
