import { resolveSession, requireClient } from "@/lib/auth";
import { sql } from "@/lib/db";
import { assertNoCostLeak } from "@/lib/denylist";
import { json } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await resolveSession(request);
  if (session instanceof Response) return session;
  const denied = requireClient(session);
  if (denied) return denied;

  const invoices = await sql(
    `select id, invoice_number, status, issued_at::text, due_date::text,
            total::text, amount_paid::text,
            greatest(total - amount_paid, 0)::text as balance,
            case
              when total - amount_paid <= 0 then 0
              when due_date >= current_date then 0
              else (current_date - due_date)
            end::int as days_past_due
     from invoice
     where customer_id = $1 and status in ('ISSUED','PARTIALLY_PAID','PAID')
     order by due_date nulls last`,
    [session.customerId],
  );
  const payload = {
    invoices,
    note: "Vista de cuentas por pagar del cliente. Sin límite de crédito ni notas internas.",
  };
  assertNoCostLeak(payload, "client.statement");
  return json(payload);
}
