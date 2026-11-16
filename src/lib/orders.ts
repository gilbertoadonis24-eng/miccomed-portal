import { sql } from "./db";
import { evaluateCredit } from "./credit";
import { allocateFefo } from "./atp";
import { audit } from "./auth";
import { n } from "./money";

export async function convertAcceptedQuote(input: {
  quoteId: string;
  actorUserId: string;
  customerPoNumber?: string | null;
  acceptBackorder?: boolean;
}): Promise<{ ok: true; orderId: string; orderNumber: string } | { ok: false; reason: string; detail?: unknown }> {
  const quotes = await sql<{
    id: string;
    customer_id: string;
    ship_to_id: string | null;
    status: string;
    freight_method: string;
  }>(`select id, customer_id, ship_to_id, status, freight_method from quote where id = $1`, [
    input.quoteId,
  ]);
  const quote = quotes[0];
  if (!quote || quote.status !== "ACCEPTED") return { ok: false, reason: "quote_not_accepted" };
  if (!quote.ship_to_id) return { ok: false, reason: "missing_ship_to" };

  const customers = await sql<{ requires_customer_po: boolean }>(
    `select requires_customer_po from customer where id = $1`,
    [quote.customer_id],
  );
  if (customers[0]?.requires_customer_po && !input.customerPoNumber) {
    return { ok: false, reason: "customer_po_required" };
  }

  const credit = await evaluateCredit(quote.customer_id);
  const seq = await sql<{ n: string }>(`select nextval('order_number_seq')::text as n`);
  const orderNumber = `OV-${new Date().getFullYear()}-${seq[0].n}`;

  const status = credit.hold ? "ON_CREDIT_HOLD" : "DRAFT";
  const order = await sql<{ id: string }>(
    `insert into sales_order (
       customer_id, ship_to_id, quote_id, order_number, status,
       customer_po_number, freight_method, created_by
     ) values ($1,$2,$3,$4,$5,$6,$7,$8) returning id`,
    [
      quote.customer_id,
      quote.ship_to_id,
      quote.id,
      orderNumber,
      status,
      input.customerPoNumber ?? null,
      quote.freight_method,
      input.actorUserId,
    ],
  );

  const lines = await sql<{
    id: string;
    line_no: number;
    sku_id: string;
    description: string;
    uom: string;
    qty: string;
    unit_price: string;
    price_source: string | null;
    backorder_accepted: boolean;
  }>(
    `select id, line_no, sku_id, description, uom, qty::text, unit_price::text,
            price_source, backorder_accepted
     from quote_line where quote_id = $1 order by line_no`,
    [quote.id],
  );

  for (const line of lines) {
    if (line.unit_price == null) return { ok: false, reason: "missing_frozen_price" };
    await sql(
      `insert into sales_order_line (
         sales_order_id, quote_line_id, line_no, sku_id, description, uom,
         qty_ordered, unit_price, price_source, backorder_accepted
       ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        order[0].id,
        line.id,
        line.line_no,
        line.sku_id,
        line.description,
        line.uom,
        line.qty,
        line.unit_price,
        line.price_source ?? "Congelado",
        line.backorder_accepted || Boolean(input.acceptBackorder),
      ],
    );
  }

  if (credit.hold) {
    await audit(input.actorUserId, "order_credit_hold", "sales_order", order[0].id, credit.reasons.join(","));
    return { ok: true, orderId: order[0].id, orderNumber };
  }

  const confirmed = await confirmOrder({
    orderId: order[0].id,
    actorUserId: input.actorUserId,
  });
  if (!confirmed.ok) return confirmed;
  return { ok: true, orderId: order[0].id, orderNumber };
}

export async function confirmOrder(input: {
  orderId: string;
  actorUserId: string;
}): Promise<{ ok: true } | { ok: false; reason: string; detail?: unknown }> {
  const orders = await sql<{
    id: string;
    customer_id: string;
    status: string;
  }>(`select id, customer_id, status from sales_order where id = $1`, [input.orderId]);
  const order = orders[0];
  if (!order) return { ok: false, reason: "not_found" };
  if (!["DRAFT", "ON_CREDIT_HOLD"].includes(order.status)) {
    return { ok: false, reason: "invalid_status" };
  }

  const credit = await evaluateCredit(order.customer_id);
  if (credit.hold) {
    await sql(`update sales_order set status = 'ON_CREDIT_HOLD' where id = $1`, [order.id]);
    return { ok: false, reason: "credit_hold", detail: credit };
  }

  const lines = await sql<{
    id: string;
    sku_id: string;
    qty_ordered: string;
    backorder_accepted: boolean;
  }>(
    `select id, sku_id, qty_ordered::text, backorder_accepted from sales_order_line where sales_order_id = $1`,
    [order.id],
  );

  for (const line of lines) {
    const alloc = await allocateFefo({
      customerId: order.customer_id,
      skuId: line.sku_id,
      qty: Number(line.qty_ordered),
      salesOrderLineId: line.id,
    });
    const reserved = n(line.qty_ordered).minus(alloc.backorderQty);
    if (n(alloc.backorderQty).gt(0) && !line.backorder_accepted) {
      return {
        ok: false,
        reason: "backorder_not_accepted",
        detail: { lineId: line.id, backorderQty: alloc.backorderQty },
      };
    }
    await sql(
      `update sales_order_line
       set qty_reserved = $2, qty_backorder = $3
       where id = $1`,
      [line.id, reserved.toFixed(4), alloc.backorderQty],
    );
  }

  await sql(
    `update sales_order
     set status = 'CONFIRMED', confirmed_at = now(),
         promised_date = current_date + 3
     where id = $1`,
    [order.id],
  );
  await audit(input.actorUserId, "order_confirmed", "sales_order", order.id);
  return { ok: true };
}

export async function releaseCreditHold(input: {
  orderId: string;
  actorUserId: string;
  reason: string;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  await sql(`update sales_order set status = 'DRAFT' where id = $1 and status = 'ON_CREDIT_HOLD'`, [
    input.orderId,
  ]);
  await audit(input.actorUserId, "credit_hold_released", "sales_order", input.orderId, input.reason);
  return confirmOrder({ orderId: input.orderId, actorUserId: input.actorUserId });
}
