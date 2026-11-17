import { resolveSession, requireInternal, requireAdmin } from "@/lib/auth";
import { sql } from "@/lib/db";
import { json } from "@/lib/http";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await resolveSession(request);
  if (session instanceof Response) return session;
  const denied = requireInternal(session);
  if (denied) return denied;

  const lots = await sql(
    `select l.id, s.sku_code, l.lot_code, l.expiry_date::text, l.is_demo,
            lb.status, lb.qty_on_hand::text, lb.qty_reserved::text
     from lot l
     join sku s on s.id = l.sku_id
     join lot_balance lb on lb.lot_id = l.id
     order by s.sku_code, l.lot_code, lb.status`,
  );
  return json({ lots });
}

const createSchema = z.object({
  skuId: z.string().uuid(),
  lotCode: z.string().min(1),
  expiryDate: z.string().nullable().optional(),
  status: z
    .enum([
      "QUARANTINE",
      "AVAILABLE",
      "HOLD_QUALITY",
      "HOLD_CUSTOMER",
      "EXPIRED",
      "DAMAGED",
      "IN_TRANSIT",
    ])
    .default("AVAILABLE"),
  qty: z.number().positive(),
});

export async function POST(request: Request) {
  const session = await resolveSession(request);
  if (session instanceof Response) return session;
  const denied = requireAdmin(session);
  if (denied) return denied;
  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) return json({ error: "invalid_body" }, 400);
  const d = parsed.data;
  const lot = await sql<{ id: string }>(
    `insert into lot (sku_id, lot_code, expiry_date) values ($1,$2,$3) returning id`,
    [d.skuId, d.lotCode, d.expiryDate ?? null],
  );
  await sql(
    `insert into lot_balance (lot_id, status, qty_on_hand, qty_reserved) values ($1,$2,$3,0)`,
    [lot[0].id, d.status, d.qty],
  );
  return json({ lotId: lot[0].id }, 201);
}
