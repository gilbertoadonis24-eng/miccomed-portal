import { resolveSession, requireClient } from "@/lib/auth";
import { sql } from "@/lib/db";
import { resolvePrice, toClientPriceDto } from "@/lib/pricing";
import { atpForCustomer } from "@/lib/atp";
import { assertNoCostLeak } from "@/lib/denylist";
import { json } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await resolveSession(request);
  if (session instanceof Response) return session;
  const denied = requireClient(session);
  if (denied) return denied;

  const customerId = session.customerId!;
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const rawLimit = Number(url.searchParams.get("limit") ?? "50");
  const rawOffset = Number(url.searchParams.get("offset") ?? "0");
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(Math.trunc(rawLimit), 1), 100) : 50;
  const offset = Number.isFinite(rawOffset) ? Math.max(Math.trunc(rawOffset), 0) : 0;

  const skus = await sql<{
    id: string;
    sku_code: string;
    title: string;
    short_description: string;
    category_slug: string;
    uom: string;
    regulatory_status: string;
    disclosable_text: string | null;
    k_number: string | null;
    k_number_verified: boolean;
  }>(
    `select s.id, s.sku_code, s.title, s.short_description, c.slug as category_slug,
            coalesce((select uom from sku_uom where sku_id = s.id and is_default limit 1), 'EACH') as uom,
            r.regulatory_status, r.disclosable_text, r.k_number, r.k_number_verified
     from sku s
     join category c on c.id = s.category_id
     left join sku_regulatory r on r.sku_id = s.id
     where s.active = true
       and ($1 = '' or s.sku_code ilike '%' || $1 || '%' or s.title ilike '%' || $1 || '%')
     order by s.sku_code
     limit $2 offset $3`,
    [q, limit, offset],
  );

  const items = [];
  for (const sku of skus) {
    const price = await resolvePrice({
      customerId,
      skuId: sku.id,
      uom: sku.uom,
      qty: 1,
    });
    const atp = await atpForCustomer(customerId, sku.id);
    const dto = toClientPriceDto(sku.sku_code, sku.uom, price);
    let regulatoryNote: string | null = null;
    if (sku.regulatory_status === "DEVICE_510K_CLEARED" && sku.k_number_verified) {
      regulatoryNote = sku.disclosable_text;
    } else if (sku.regulatory_status === "PACKAGING_ONLY") {
      regulatoryNote = sku.disclosable_text;
    } else if (sku.disclosable_text && sku.regulatory_status !== "UNKNOWN") {
      regulatoryNote = sku.disclosable_text;
    }

    items.push({
      id: sku.id,
      sku_code: sku.sku_code,
      title: sku.title,
      short_description: sku.short_description,
      category: sku.category_slug,
      uom: sku.uom,
      price: dto,
      atp_qty: atp.atpQty,
      availability:
        Number(atp.atpQty) > 10
          ? "EN_STOCK"
          : Number(atp.atpQty) > 0
            ? "LIMITADO"
            : "NO_DISPONIBLE",
      regulatory_note: regulatoryNote,
      cta: dto.unit_price ? "Agregar a RFQ" : "Solicitar cotización",
    });
  }

  assertNoCostLeak(items, "client.catalog");
  return json({
    items,
    limit,
    offset,
    demo_banner: "Datos DEMO — no son precios reales MiccoMed",
  });
}
