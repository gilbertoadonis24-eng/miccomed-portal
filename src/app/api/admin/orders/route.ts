import { resolveSession, requireInternal, requirePermission } from "@/lib/auth";
import { sql } from "@/lib/db";
import { confirmOrder, releaseCreditHold } from "@/lib/orders";
import { shipOrder } from "@/lib/fulfillment";
import { json } from "@/lib/http";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await resolveSession(request);
  if (session instanceof Response) return session;
  const denied = requireInternal(session);
  if (denied) return denied;
  const orders = await sql(
    `select so.id, so.order_number, so.status, so.promised_date::text, c.code as customer_code
     from sales_order so join customer c on c.id = so.customer_id
     order by so.created_at desc`,
  );
  return json({ orders });
}

const actionSchema = z.object({
  orderId: z.string().uuid(),
  action: z.enum(["confirm", "release_hold", "ship"]),
  reason: z.string().optional(),
  receiverName: z.string().optional(),
  note: z.string().optional(),
});

export async function POST(request: Request) {
  const session = await resolveSession(request);
  if (session instanceof Response) return session;
  const denied = requireInternal(session);
  if (denied) return denied;
  const parsed = actionSchema.safeParse(await request.json());
  if (!parsed.success) return json({ error: "invalid_body" }, 400);

  if (parsed.data.action === "confirm") {
    const perm = requirePermission(session, "confirm_order");
    if (perm) return perm;
    const result = await confirmOrder({
      orderId: parsed.data.orderId,
      actorUserId: session.id,
    });
    return json(result, result.ok ? 200 : 400);
  }

  if (parsed.data.action === "release_hold") {
    if (session.role !== "INTERNAL_ADMIN") return json({ error: "forbidden" }, 403);
    if (!parsed.data.reason) return json({ error: "reason_required" }, 400);
    const result = await releaseCreditHold({
      orderId: parsed.data.orderId,
      actorUserId: session.id,
      reason: parsed.data.reason,
    });
    return json(result, result.ok ? 200 : 400);
  }

  if (parsed.data.action === "ship") {
    // shipOrder emite factura al embarque → exige ship + issue_invoice.
    const shipPerm = requirePermission(session, "ship");
    if (shipPerm) return shipPerm;
    const invoicePerm = requirePermission(session, "issue_invoice");
    if (invoicePerm) return invoicePerm;
    if (!parsed.data.receiverName) return json({ error: "receiver_required" }, 400);
    const result = await shipOrder({
      orderId: parsed.data.orderId,
      actorUserId: session.id,
      receiverName: parsed.data.receiverName,
      note: parsed.data.note,
    });
    return json(result, result.ok ? 200 : 400);
  }

  return json({ error: "unsupported" }, 400);
}
