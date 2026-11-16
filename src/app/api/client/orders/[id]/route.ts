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

  const orders = await sql(
    `select id, order_number, status, promised_date::text, customer_po_number, freight_method, created_at::text
     from sales_order where id = $1 and customer_id = $2`,
    [id, session.customerId],
  );
  if (!orders[0]) return notFound();
  const lines = await sql(
    `select id, line_no, description, uom, qty_ordered::text, qty_reserved::text,
            qty_shipped::text, qty_backorder::text, unit_price::text, price_source
     from sales_order_line where sales_order_id = $1 order by line_no`,
    [id],
  );
  const shipments = await sql(
    `select id, shipment_number, status, shipped_at::text, delivered_at::text
     from shipment where sales_order_id = $1 and customer_id = $2`,
    [id, session.customerId],
  );
  const payload = { order: orders[0], lines, shipments };
  assertNoCostLeak(payload, "client.orders.get");
  return json(payload);
}
