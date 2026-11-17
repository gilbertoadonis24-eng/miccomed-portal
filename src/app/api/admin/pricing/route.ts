import { resolveSession, requirePermission, requireAdmin } from "@/lib/auth";
import { sql } from "@/lib/db";
import { json } from "@/lib/http";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await resolveSession(request);
  if (session instanceof Response) return session;
  const denied = requirePermission(session, "view_cost");
  if (denied) return denied;

  const ulc = await sql(
    `select u.id, s.sku_code, u.ulc::text, u.effective_from::text, u.assumptions_note, u.is_demo
     from ulc_record u join sku s on s.id = u.sku_id
     order by s.sku_code, u.effective_from desc`,
  );
  const tiers = await sql(
    `select pl.tier, s.sku_code, pli.uom, pli.min_qty::text, pli.unit_price::text
     from price_list_item pli
     join price_list pl on pl.id = pli.price_list_id
     join sku s on s.id = pli.sku_id
     order by pl.tier, s.sku_code`,
  );
  const policies = await sql(
    `select id, min_margin_pct::text, effective_from::text, note from margin_policy`,
  );
  return json({ ulc, tiers, policies });
}

const ulcSchema = z.object({
  skuId: z.string().uuid(),
  ulc: z.number().positive(),
  assumptionsNote: z.string().optional(),
});

export async function POST(request: Request) {
  const session = await resolveSession(request);
  if (session instanceof Response) return session;
  const body = await request.json();
  if (body?.action === "upsert_ulc") {
    // Escritura de ULC es maestro: no basta view_cost (solo lectura).
    const denied = requireAdmin(session);
    if (denied) return denied;
    const parsed = ulcSchema.safeParse(body);
    if (!parsed.success) return json({ error: "invalid_body" }, 400);
    const rows = await sql(
      `insert into ulc_record (sku_id, ulc, effective_from, assumptions_note)
       values ($1,$2,current_date,$3) returning id`,
      [parsed.data.skuId, parsed.data.ulc, parsed.data.assumptionsNote ?? null],
    );
    return json({ ulc: rows[0] }, 201);
  }
  return json({ error: "unsupported_action" }, 400);
}
