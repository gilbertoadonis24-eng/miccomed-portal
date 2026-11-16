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

  const shipments = await sql(
    `select id, shipment_number, status, shipped_at::text, delivered_at::text, sales_order_id
     from shipment where id = $1 and customer_id = $2`,
    [id, session.customerId],
  );
  if (!shipments[0]) return notFound();

  const lines = await sql(
    `select sku_id, qty::text, lot_code, expiry_date::text
     from shipment_line where shipment_id = $1 and customer_id = $2`,
    [id, session.customerId],
  );
  const pod = await sql(
    `select receiver_name, received_at::text, note from proof_of_delivery where shipment_id = $1`,
    [id],
  );
  const payload = { shipment: shipments[0], lines, pod: pod[0] ?? null };
  assertNoCostLeak(payload, "client.deliveries");
  return json(payload);
}
