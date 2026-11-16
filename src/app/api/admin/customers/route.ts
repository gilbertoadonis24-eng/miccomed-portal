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

  const customers = await sql(
    `select id, code, legal_name, trade_name, tier, payment_terms, credit_limit::text,
            credit_status, min_shelf_life_days, is_demo, active,
            internal_ar_notes
     from customer order by code`,
  );
  return json({ customers });
}

const createSchema = z.object({
  code: z.string().min(2),
  legalName: z.string().min(2),
  tradeName: z.string().optional(),
  tier: z.enum(["LIST", "TIER_A", "TIER_B"]),
  paymentTerms: z.enum(["COD", "NET_15", "NET_30", "NET_45"]),
  creditLimit: z.number().nonnegative(),
  minShelfLifeDays: z.number().int().positive().default(180),
});

export async function POST(request: Request) {
  const session = await resolveSession(request);
  if (session instanceof Response) return session;
  const denied = requireInternal(session);
  if (denied) return denied;
  if (session.role !== "INTERNAL_ADMIN") {
    return json({ error: "forbidden" }, 403);
  }

  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) return json({ error: "invalid_body" }, 400);
  const d = parsed.data;
  const rows = await sql(
    `insert into customer (
       code, legal_name, trade_name, tier, payment_terms, credit_limit, min_shelf_life_days
     ) values ($1,$2,$3,$4,$5,$6,$7) returning id, code`,
    [
      d.code,
      d.legalName,
      d.tradeName ?? null,
      d.tier,
      d.paymentTerms,
      d.creditLimit,
      d.minShelfLifeDays,
    ],
  );
  return json({ customer: rows[0] }, 201);
}
