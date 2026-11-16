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

  const orders = await sql(
    `select id, order_number, status, promised_date::text, customer_po_number, created_at::text
     from sales_order where customer_id = $1 order by created_at desc`,
    [session.customerId],
  );
  assertNoCostLeak(orders, "client.orders");
  return json({ orders });
}
