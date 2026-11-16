import { resolveSession, requireClient } from "@/lib/auth";
import { sql } from "@/lib/db";
import { assertNoCostLeak } from "@/lib/denylist";
import { json, notFound } from "@/lib/http";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, ctx: Ctx) {
  const session = await resolveSession(request);
  if (session instanceof Response) return session;
  const denied = requireClient(session);
  if (denied) return denied;
  const { id } = await ctx.params;

  const invoices = await sql(
    `select id, invoice_number, status, issued_at::text, due_date::text,
            subtotal::text, tax_amount::text, total::text, amount_paid::text,
            greatest(total - amount_paid, 0)::text as balance,
            case
              when total - amount_paid <= 0 then 0
              when due_date >= current_date then 0
              else (current_date - due_date)
            end::int as days_past_due
     from invoice
     where id = $1 and customer_id = $2 and status <> 'DRAFT' and status <> 'VOID'`,
    [id, session.customerId],
  );
  if (!invoices[0]) return notFound();
  const lines = await sql(
    `select description, uom, qty::text, unit_price::text, line_amount::text
     from invoice_line where invoice_id = $1`,
    [id],
  );
  const docs = await sql(
    `select id, label, content_text from document_file where object_id = $1 and doc_type = 'invoice_pdf'`,
    [id],
  );
  const payload = { invoice: invoices[0], lines, pdf: docs[0] ?? null };
  assertNoCostLeak(payload, "client.invoices");
  return json(payload);
}
