import { resolveSession, requireInternal } from "@/lib/auth";
import { sql } from "@/lib/db";
import { json, notFound } from "@/lib/http";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, ctx: Ctx) {
  const session = await resolveSession(request);
  if (session instanceof Response) return session;
  const denied = requireInternal(session);
  if (denied) return denied;
  const { id } = await ctx.params;

  const quotes = await sql(
    `select q.*, c.code as customer_code, c.legal_name
     from quote q join customer c on c.id = q.customer_id where q.id = $1`,
    [id],
  );
  if (!quotes[0]) return notFound();
  const lines = await sql(
    `select ql.*, qlc.ulc::text, qlc.floor_price::text, qlc.margin_pct::text, qlc.below_floor
     from quote_line ql
     left join quote_line_cost qlc on qlc.quote_line_id = ql.id
     where ql.quote_id = $1 order by ql.line_no`,
    [id],
  );
  const canViewCost =
    session.role === "INTERNAL_ADMIN" || session.permissions.includes("view_cost");
  const safeLines = canViewCost
    ? lines
    : lines.map((l) => {
        const row = { ...l } as Record<string, unknown>;
        delete row.ulc;
        delete row.floor_price;
        delete row.margin_pct;
        delete row.below_floor;
        return row;
      });
  return json({ quote: quotes[0], lines: safeLines });
}
