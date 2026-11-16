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

  const customers = await sql(
    `select id, code, legal_name, trade_name, tier, payment_terms,
            min_shelf_life_days, document_language, is_demo
     from customer where id = $1`,
    [session.customerId],
  );
  const shipTos = await sql(
    `select id, name, address_line1, city, state, postal_code, contact_name
     from ship_to where customer_id = $1 and active = true`,
    [session.customerId],
  );
  const payload = { customer: customers[0], ship_tos: shipTos };
  assertNoCostLeak(payload, "client.account");
  return json(payload);
}
