import { resolveSession, requireInternal, requirePermission, audit } from "@/lib/auth";
import { sql } from "@/lib/db";
import { sendQuote } from "@/lib/quotes";
import { convertAcceptedQuote } from "@/lib/orders";
import { json, notFound } from "@/lib/http";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await resolveSession(request);
  if (session instanceof Response) return session;
  const denied = requireInternal(session);
  if (denied) return denied;

  const quotes = await sql(
    `select q.id, q.quote_number, q.revision, q.status, q.valid_until::text,
            c.code as customer_code, c.legal_name
     from quote q join customer c on c.id = q.customer_id
     order by q.created_at desc`,
  );
  return json({ quotes });
}

const actionSchema = z.object({
  quoteId: z.string().uuid(),
  action: z.enum(["send", "margin_override", "convert"]),
  reason: z.string().optional(),
  lineId: z.string().uuid().optional(),
  authorizedPrice: z.number().optional(),
  customerPoNumber: z.string().optional(),
  acceptBackorder: z.boolean().optional(),
});

export async function POST(request: Request) {
  const session = await resolveSession(request);
  if (session instanceof Response) return session;
  const denied = requireInternal(session);
  if (denied) return denied;

  const parsed = actionSchema.safeParse(await request.json());
  if (!parsed.success) return json({ error: "invalid_body" }, 400);
  const data = parsed.data;

  if (data.action === "send") {
    const perm = requirePermission(session, "send_quote");
    if (perm) return perm;
    const result = await sendQuote({ quoteId: data.quoteId, actorUserId: session.id });
    return json(result, result.ok ? 200 : 400);
  }

  if (data.action === "margin_override") {
    const perm = requirePermission(session, "override_margin");
    if (perm) return perm;
    if (!data.reason || data.authorizedPrice == null || !data.lineId) {
      return json({ error: "reason_line_price_required" }, 400);
    }
    const costs = await sql<{ ulc: string; floor_price: string }>(
      `select ulc::text, floor_price::text from quote_line_cost where quote_line_id = $1`,
      [data.lineId],
    );
    await sql(
      `insert into margin_override (
         quote_id, quote_line_id, reason, actor_user_id, authorized_price, floor_broken, ulc_used
       ) values ($1,$2,$3,$4,$5,$6,$7)`,
      [
        data.quoteId,
        data.lineId,
        data.reason,
        session.id,
        data.authorizedPrice,
        costs[0]?.floor_price ?? null,
        costs[0]?.ulc ?? null,
      ],
    );
    await sql(
      `update quote_line set unit_price = $2, line_status = 'OK',
         line_amount = round(($2::numeric * qty)::numeric, 2)
       where id = $1`,
      [data.lineId, data.authorizedPrice],
    );
    await audit(session.id, "margin_override", "quote", data.quoteId, data.reason);
    const sent = await sendQuote({
      quoteId: data.quoteId,
      actorUserId: session.id,
      allowBelowFloor: true,
    });
    return json(sent, sent.ok ? 200 : 400);
  }

  if (data.action === "convert") {
    const perm = requirePermission(session, "confirm_order");
    if (perm) return perm;
    const result = await convertAcceptedQuote({
      quoteId: data.quoteId,
      actorUserId: session.id,
      customerPoNumber: data.customerPoNumber,
      acceptBackorder: data.acceptBackorder,
    });
    return json(result, result.ok ? 200 : 400);
  }

  return notFound();
}
