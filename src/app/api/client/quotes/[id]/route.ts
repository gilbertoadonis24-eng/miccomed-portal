import { resolveSession, requireClient } from "@/lib/auth";
import { sql } from "@/lib/db";
import { acceptQuote, clientQuoteDto } from "@/lib/quotes";
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

  const quotes = await sql(`select * from quote where id = $1 and customer_id = $2`, [
    id,
    session.customerId,
  ]);
  if (!quotes[0]) return notFound();
  const lines = await sql(
    `select id, line_no, sku_id, description, uom, qty::text, unit_price::text,
            line_amount::text, price_source, atp_qty::text, line_status
     from quote_line where quote_id = $1 order by line_no`,
    [id],
  );
  const dto = clientQuoteDto(quotes[0] as Record<string, unknown>, lines as Record<string, unknown>[]);
  assertNoCostLeak(dto, "client.quotes.get");
  return json({ quote: dto });
}

export async function POST(request: Request, ctx: Ctx) {
  const session = await resolveSession(request);
  if (session instanceof Response) return session;
  const denied = requireClient(session);
  if (denied) return denied;
  const { id } = await ctx.params;
  const body = await request.json().catch(() => ({}));
  if (body?.action !== "accept") return json({ error: "unsupported_action" }, 400);

  const result = await acceptQuote({
    quoteId: id,
    actorUserId: session.id,
    customerId: session.customerId!,
  });
  if (!result.ok) {
    if (result.reason === "not_found") return notFound();
    return json(result, 400);
  }
  return json({ ok: true });
}
