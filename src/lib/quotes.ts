import { sql } from "./db";
import { resolvePrice } from "./pricing";
import { atpForCustomer } from "./atp";
import { lineAmount, money2 } from "./money";
import { audit } from "./auth";

export async function createRfq(input: {
  customerId: string;
  shipToId: string;
  createdBy: string;
  lines: { skuId: string; uom: string; qty: number; description?: string }[];
  notes?: string;
}): Promise<{ quoteId: string; quoteNumber: string }> {
  const seq = await sql<{ n: string }>(`select nextval('quote_number_seq')::text as n`);
  const quoteNumber = `Q-${new Date().getFullYear()}-${seq[0].n}`;

  const inserted = await sql<{ id: string }>(
    `insert into quote (
       customer_id, ship_to_id, quote_number, revision, status,
       freight_method, notes_customer, created_by
     ) values ($1,$2,$3,1,'SUBMITTED','MICCOMED_FLEET',$4,$5)
     returning id`,
    [input.customerId, input.shipToId, quoteNumber, input.notes ?? null, input.createdBy],
  );
  const quoteId = inserted[0].id;

  let lineNo = 1;
  for (const line of input.lines) {
    const skus = await sql<{ title: string }>(`select title from sku where id = $1`, [line.skuId]);
    const price = await resolvePrice({
      customerId: input.customerId,
      skuId: line.skuId,
      uom: line.uom,
      qty: line.qty,
    });
    const atp = await atpForCustomer(input.customerId, line.skuId);
    const unitPrice = price.unitPrice;
    const amount = unitPrice ? lineAmount(unitPrice, line.qty) : null;
    const lineStatus =
      price.status === "NO_COST" || price.status === "NO_POLICY"
        ? "PROVISIONAL"
        : price.status;

    const ql = await sql<{ id: string }>(
      `insert into quote_line (
         quote_id, line_no, sku_id, description, uom, qty, unit_price, line_amount,
         price_source, price_list_item_id, contract_line_id, override_id, line_status, atp_qty
       ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       returning id`,
      [
        quoteId,
        lineNo,
        line.skuId,
        line.description ?? skus[0]?.title ?? "SKU",
        line.uom,
        line.qty,
        unitPrice,
        amount,
        price.priceSourceLabel,
        price.priceListItemId,
        price.contractLineId,
        price.overrideId,
        lineStatus,
        atp.atpQty,
      ],
    );

    await sql(
      `insert into quote_line_cost (
         quote_line_id, ulc_record_id, ulc, floor_price, margin_pct, below_floor
       ) values ($1,$2,$3,$4,$5,$6)`,
      [
        ql[0].id,
        price.ulcRecordId,
        price.ulc,
        price.floorPrice,
        price.marginPct,
        price.status === "BELOW_FLOOR",
      ],
    );
    lineNo += 1;
  }

  await sql(`update quote set status = 'PRICED' where id = $1`, [quoteId]);
  await audit(input.createdBy, "rfq_created", "quote", quoteId);
  return { quoteId, quoteNumber };
}

export async function sendQuote(input: {
  quoteId: string;
  actorUserId: string;
  allowBelowFloor?: boolean;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  const quotes = await sql<{
    id: string;
    customer_id: string;
    quote_number: string;
    revision: number;
    status: string;
  }>(`select * from quote where id = $1`, [input.quoteId]);
  const quote = quotes[0];
  if (!quote) return { ok: false, reason: "not_found" };
  if (!["PRICED", "PENDING_APPROVAL", "DRAFT", "SUBMITTED"].includes(quote.status)) {
    return { ok: false, reason: "invalid_status" };
  }

  const lines = await sql<{
    id: string;
    line_status: string;
    unit_price: string | null;
  }>(`select id, line_status, unit_price::text from quote_line where quote_id = $1`, [
    input.quoteId,
  ]);

  if (lines.some((l) => l.line_status === "UNPRICED" || l.unit_price == null)) {
    return { ok: false, reason: "unpriced_lines" };
  }
  if (lines.some((l) => l.line_status === "PROVISIONAL" || l.line_status === "NO_COST" || l.line_status === "NO_POLICY")) {
    return { ok: false, reason: "provisional_lines" };
  }

  const below = lines.filter((l) => l.line_status === "BELOW_FLOOR");
  if (below.length > 0) {
    const overrides = await sql<{ id: string }>(
      `select id from margin_override where quote_id = $1`,
      [input.quoteId],
    );
    if (overrides.length === 0 && !input.allowBelowFloor) {
      await sql(`update quote set status = 'PENDING_APPROVAL' where id = $1`, [input.quoteId]);
      return { ok: false, reason: "pending_approval" };
    }
  }

  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + 10);

  // Congelar: re-resolver y comparar, luego fijar foto
  for (const line of await sql<{
    id: string;
    sku_id: string;
    uom: string;
    qty: string;
    unit_price: string;
    customer_id: string;
  }>(
    `select ql.id, ql.sku_id, ql.uom, ql.qty::text, ql.unit_price::text, q.customer_id
     from quote_line ql join quote q on q.id = ql.quote_id where ql.quote_id = $1`,
    [input.quoteId],
  )) {
    const resolved = await resolvePrice({
      customerId: line.customer_id,
      skuId: line.sku_id,
      uom: line.uom,
      qty: Number(line.qty),
    });
    if (resolved.unitPrice !== line.unit_price) {
      // No silent change: keep frozen draft price already stored; only block if unpriced
      // For send we keep the priced snapshot already on the line.
    }
    await sql(
      `update quote_line set
         price_source = coalesce(price_source, $2),
         line_amount = $3
       where id = $1`,
      [line.id, resolved.priceSourceLabel, lineAmount(line.unit_price, line.qty)],
    );
  }

  await sql(
    `update quote set status = 'SENT', sent_at = now(), valid_until = $2 where id = $1`,
    [input.quoteId, validUntil.toISOString().slice(0, 10)],
  );

  const pdf = await buildQuotePdfText(input.quoteId);
  await sql(
    `insert into document_file (customer_id, doc_type, object_id, label, content_text)
     values ($1, 'quote_pdf', $2, $3, $4)`,
    [quote.customer_id, quote.id, `${quote.quote_number}-r${quote.revision}.txt`, pdf],
  );

  await audit(input.actorUserId, "quote_sent", "quote", input.quoteId);
  return { ok: true };
}

export async function acceptQuote(input: {
  quoteId: string;
  actorUserId: string;
  customerId: string;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  const quotes = await sql<{
    id: string;
    customer_id: string;
    status: string;
    valid_until: string | null;
  }>(`select id, customer_id, status, valid_until::text from quote where id = $1`, [
    input.quoteId,
  ]);
  const quote = quotes[0];
  if (!quote || quote.customer_id !== input.customerId) {
    return { ok: false, reason: "not_found" };
  }
  if (quote.status !== "SENT") return { ok: false, reason: "not_sent" };
  if (quote.valid_until && quote.valid_until < new Date().toISOString().slice(0, 10)) {
    await sql(`update quote set status = 'EXPIRED' where id = $1`, [input.quoteId]);
    return { ok: false, reason: "expired" };
  }

  await sql(
    `update quote set status = 'ACCEPTED', accepted_at = now(), accepted_by = $2 where id = $1`,
    [input.quoteId, input.actorUserId],
  );
  await audit(input.actorUserId, "quote_accepted", "quote", input.quoteId);
  return { ok: true };
}

export async function buildQuotePdfText(quoteId: string): Promise<string> {
  const quotes = await sql<Record<string, unknown>>(
    `select q.*, c.legal_name, c.trade_name
     from quote q join customer c on c.id = q.customer_id where q.id = $1`,
    [quoteId],
  );
  const q = quotes[0];
  const lines = await sql<Record<string, unknown>>(
    `select line_no, description, uom, qty::text, unit_price::text, line_amount::text, atp_qty::text
     from quote_line where quote_id = $1 order by line_no`,
    [quoteId],
  );
  const total = money2(
    lines.reduce((acc, l) => acc + Number(l.line_amount ?? 0), 0),
  );
  const rows = lines
    .map(
      (l) =>
        `${l.line_no} | ${l.description} | ${l.uom} | ${l.qty} | ${l.unit_price} | ${l.line_amount} | ATP ${l.atp_qty}`,
    )
    .join("\n");
  const vigencia =
    q.valid_until == null
      ? ""
      : String(q.valid_until).slice(0, 10);
  return [
    "COTIZACIÓN MiccoMed (DEMO) — ESPAÑOL",
    `Número: ${q.quote_number} rev ${q.revision}`,
    `Cliente: ${q.legal_name}`,
    `Vigencia: ${vigencia}`,
    "SKU/Desc | UOM | Qty | P.unit | Importe | ATP",
    rows,
    `TOTAL USD: ${total}`,
    "Documento cliente: sin columnas de costo interno.",
  ].join("\n");
}

export function clientQuoteDto(quote: Record<string, unknown>, lines: Record<string, unknown>[]) {
  return {
    id: quote.id,
    quote_number: quote.quote_number,
    revision: quote.revision,
    status: quote.status,
    valid_until: quote.valid_until,
    freight_method: quote.freight_method,
    notes_customer: quote.notes_customer,
    lines: lines.map((l) => ({
      id: l.id,
      line_no: l.line_no,
      sku_id: l.sku_id,
      description: l.description,
      uom: l.uom,
      qty: l.qty,
      unit_price: l.unit_price,
      line_amount: l.line_amount,
      price_source: l.price_source,
      atp_qty: l.atp_qty,
      line_status:
        l.line_status === "OK"
          ? "OK"
          : l.line_status === "UNPRICED"
            ? "UNPRICED"
            : "EN_REVISION",
    })),
  };
}
