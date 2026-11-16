import { redirect, notFound } from "next/navigation";
import { AppChrome } from "@/components/AppChrome";
import { getServerSession } from "@/lib/session-server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function FacturaPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session || session.plane !== "client") redirect("/");
  const { id } = await params;
  const invoices = await sql(
    `select * from invoice where id = $1 and customer_id = $2 and status <> 'DRAFT'`,
    [id, session.customerId],
  );
  if (!invoices[0]) notFound();
  const lines = await sql(
    `select description, uom, qty::text, unit_price::text, line_amount::text
     from invoice_line where invoice_id = $1`,
    [id],
  );
  const docs = await sql(
    `select content_text from document_file where object_id = $1 and doc_type = 'invoice_pdf'`,
    [id],
  );
  return (
    <AppChrome session={session}>
      <section className="panel">
        <h1>Factura {String(invoices[0].invoice_number)}</h1>
        <table>
          <thead>
            <tr>
              <th>Descripción</th>
              <th>Qty</th>
              <th>P.unit</th>
              <th>Importe</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, idx) => (
              <tr key={idx}>
                <td>{String(l.description)}</td>
                <td>{String(l.qty)}</td>
                <td>{String(l.unit_price)}</td>
                <td>{String(l.line_amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {docs[0] && (
          <pre style={{ whiteSpace: "pre-wrap", marginTop: "1rem" }}>
            {String(docs[0].content_text)}
          </pre>
        )}
      </section>
    </AppChrome>
  );
}
