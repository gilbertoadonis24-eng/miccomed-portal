import { resolveSession, requireInternal } from "@/lib/auth";
import { sql } from "@/lib/db";
import { json } from "@/lib/http";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await resolveSession(request);
  if (session instanceof Response) return session;
  const denied = requireInternal(session);
  if (denied) return denied;

  const skus = await sql(
    `select s.id, s.sku_code, s.title, s.active, s.dated, s.is_demo, c.slug as category,
            (select ulc::text from ulc_record u where u.sku_id = s.id order by effective_from desc limit 1) as ulc
     from sku s join category c on c.id = s.category_id
     order by s.sku_code`,
  );
  const canViewCost =
    session.role === "INTERNAL_ADMIN" || session.permissions.includes("view_cost");
  const safe = skus.map((s) => {
    if (canViewCost) return s;
    const { ulc: _ulc, ...rest } = s as Record<string, unknown>;
    return rest;
  });
  return json({ skus: safe });
}

const skuSchema = z.object({
  skuCode: z.string().min(2),
  title: z.string().min(2),
  categorySlug: z.string(),
  dated: z.boolean().default(true),
  shortDescription: z.string().optional(),
});

export async function POST(request: Request) {
  const session = await resolveSession(request);
  if (session instanceof Response) return session;
  if (session.role !== "INTERNAL_ADMIN") return json({ error: "forbidden" }, 403);
  const parsed = skuSchema.safeParse(await request.json());
  if (!parsed.success) return json({ error: "invalid_body" }, 400);
  const cats = await sql<{ id: string }>(`select id from category where slug = $1`, [
    parsed.data.categorySlug,
  ]);
  if (!cats[0]) return json({ error: "category_missing" }, 400);
  const rows = await sql(
    `insert into sku (sku_code, title, short_description, category_id, dated)
     values ($1,$2,$3,$4,$5) returning id, sku_code`,
    [
      parsed.data.skuCode,
      parsed.data.title,
      parsed.data.shortDescription ?? "",
      cats[0].id,
      parsed.data.dated,
    ],
  );
  await sql(
    `insert into sku_uom (sku_id, uom, factor_to_base, is_default) values ($1,'EACH',1,true)`,
    [rows[0].id],
  );
  await sql(
    `insert into sku_regulatory (sku_id, regulatory_status) values ($1,'UNKNOWN')`,
    [rows[0].id],
  );
  return json({ sku: rows[0] }, 201);
}
