import { resolveSession, requireClient } from "@/lib/auth";
import { sql } from "@/lib/db";
import { createRfq, clientQuoteDto } from "@/lib/quotes";
import { assertNoCostLeak } from "@/lib/denylist";
import { json, notFound } from "@/lib/http";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await resolveSession(request);
  if (session instanceof Response) return session;
  const denied = requireClient(session);
  if (denied) return denied;

  const rows = await sql(
    `select id, quote_number, revision, status, valid_until::text, created_at::text
     from quote where customer_id = $1 order by created_at desc`,
    [session.customerId],
  );
  assertNoCostLeak(rows, "client.quotes.list");
  return json({ quotes: rows });
}

const bodySchema = z.object({
  shipToId: z.string().uuid(),
  notes: z.string().optional(),
  lines: z
    .array(
      z.object({
        skuId: z.string().uuid(),
        uom: z.enum(["EACH", "CASE", "PALLET"]),
        qty: z.number().positive(),
      }),
    )
    .min(1),
});

export async function POST(request: Request) {
  const session = await resolveSession(request);
  if (session instanceof Response) return session;
  const denied = requireClient(session);
  if (denied) return denied;

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) return json({ error: "invalid_body", detail: parsed.error.flatten() }, 400);

  const ship = await sql<{ id: string }>(
    `select id from ship_to where id = $1 and customer_id = $2`,
    [parsed.data.shipToId, session.customerId],
  );
  if (!ship[0]) return notFound();

  const created = await createRfq({
    customerId: session.customerId!,
    shipToId: parsed.data.shipToId,
    createdBy: session.id,
    lines: parsed.data.lines,
    notes: parsed.data.notes,
  });

  const quote = (
    await sql(`select * from quote where id = $1`, [created.quoteId])
  )[0] as Record<string, unknown>;
  const lines = (await sql(
    `select id, line_no, sku_id, description, uom, qty::text, unit_price::text,
            line_amount::text, price_source, atp_qty::text, line_status
     from quote_line where quote_id = $1 order by line_no`,
    [created.quoteId],
  )) as Record<string, unknown>[];

  const dto = clientQuoteDto(quote, lines);
  assertNoCostLeak(dto, "client.quotes.create");
  return json({ quote: dto }, 201);
}
