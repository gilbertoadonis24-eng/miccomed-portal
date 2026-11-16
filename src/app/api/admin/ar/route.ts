import { resolveSession, requireInternal, requirePermission } from "@/lib/auth";
import { sql } from "@/lib/db";
import { applyPayment } from "@/lib/fulfillment";
import { evaluateCredit } from "@/lib/credit";
import { json } from "@/lib/http";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await resolveSession(request);
  if (session instanceof Response) return session;
  const denied = requireInternal(session);
  if (denied) return denied;

  const invoices = await sql(
    `select i.id, i.invoice_number, i.status, i.due_date::text, i.total::text, i.amount_paid::text,
            greatest(i.total - i.amount_paid, 0)::text as balance,
            case
              when i.total - i.amount_paid <= 0 then 0
              when i.due_date >= current_date then 0
              else (current_date - i.due_date)
            end::int as days_past_due,
            c.code as customer_code, c.internal_ar_notes, i.is_demo
     from invoice i join customer c on c.id = i.customer_id
     where i.status in ('DRAFT','ISSUED','PARTIALLY_PAID','PAID')
     order by i.due_date nulls last`,
  );

  const aging = await sql(
    `select
       sum(case when dpd between 1 and 30 then bal else 0 end)::text as b_1_30,
       sum(case when dpd between 31 and 60 then bal else 0 end)::text as b_31_60,
       sum(case when dpd between 61 and 90 then bal else 0 end)::text as b_61_90,
       sum(case when dpd > 90 then bal else 0 end)::text as b_90_plus
     from (
       select greatest(total - amount_paid, 0) as bal,
              case when total - amount_paid <= 0 then 0
                   when due_date >= current_date then 0
                   else (current_date - due_date) end as dpd
       from invoice where status in ('ISSUED','PARTIALLY_PAID')
     ) x`,
  );

  return json({ invoices, aging: aging[0] });
}

const paySchema = z.object({
  action: z.literal("apply_payment"),
  customerId: z.string().uuid(),
  invoiceId: z.string().uuid(),
  amount: z.number().positive(),
  reference: z.string().optional(),
});

export async function POST(request: Request) {
  const session = await resolveSession(request);
  if (session instanceof Response) return session;
  const perm = requirePermission(session, "post_payment");
  if (perm) return perm;
  const parsed = paySchema.safeParse(await request.json());
  if (!parsed.success) return json({ error: "invalid_body" }, 400);
  const result = await applyPayment({
    customerId: parsed.data.customerId,
    invoiceId: parsed.data.invoiceId,
    amount: parsed.data.amount,
    actorUserId: session.id,
    reference: parsed.data.reference,
  });
  if (!result.ok) return json(result, 400);
  const credit = await evaluateCredit(parsed.data.customerId);
  return json({ ...result, credit });
}
