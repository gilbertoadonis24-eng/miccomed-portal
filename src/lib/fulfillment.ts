import { sql } from "./db";
import { audit } from "./auth";
import { lineAmount, money2, n } from "./money";

export async function shipOrder(input: {
  orderId: string;
  actorUserId: string;
  receiverName: string;
  note?: string;
}): Promise<{ ok: true; shipmentId: string; invoiceId: string } | { ok: false; reason: string }> {
  const orders = await sql<{
    id: string;
    customer_id: string;
    status: string;
  }>(`select id, customer_id, status from sales_order where id = $1`, [input.orderId]);
  const order = orders[0];
  if (!order) return { ok: false, reason: "not_found" };
  if (!["CONFIRMED", "ALLOCATED", "PARTIALLY_ALLOCATED", "PICKING"].includes(order.status)) {
    return { ok: false, reason: "invalid_status" };
  }

  const seq = await sql<{ n: string }>(`select nextval('shipment_number_seq')::text as n`);
  const shipmentNumber = `SH-${new Date().getFullYear()}-${seq[0].n}`;
  const shipment = await sql<{ id: string }>(
    `insert into shipment (sales_order_id, customer_id, shipment_number, status, shipped_at, delivered_at)
     values ($1,$2,$3,'DELIVERED', now(), now()) returning id`,
    [order.id, order.customer_id, shipmentNumber],
  );

  const allocations = await sql<{
    allocation_id: string;
    sales_order_line_id: string;
    sku_id: string;
    qty: string;
    lot_id: string;
    lot_code: string;
    expiry_date: string | null;
    unit_price: string;
    description: string;
    uom: string;
  }>(
    `select a.id as allocation_id, a.sales_order_line_id, sol.sku_id, a.qty::text,
            a.lot_id, l.lot_code, l.expiry_date::text, sol.unit_price::text,
            sol.description, sol.uom
     from allocation a
     join sales_order_line sol on sol.id = a.sales_order_line_id
     join lot l on l.id = a.lot_id
     where sol.sales_order_id = $1`,
    [order.id],
  );

  if (allocations.length === 0) return { ok: false, reason: "nothing_to_ship" };

  const shipLines: { id: string; unit_price: string; qty: string; description: string; uom: string; sku_id: string }[] = [];

  for (const a of allocations) {
    const sl = await sql<{ id: string }>(
      `insert into shipment_line (
         shipment_id, sales_order_line_id, sku_id, customer_id, qty, lot_code, expiry_date
       ) values ($1,$2,$3,$4,$5,$6,$7) returning id`,
      [
        shipment[0].id,
        a.sales_order_line_id,
        a.sku_id,
        order.customer_id,
        a.qty,
        a.lot_code,
        a.expiry_date,
      ],
    );
    shipLines.push({
      id: sl[0].id,
      unit_price: a.unit_price,
      qty: a.qty,
      description: a.description,
      uom: a.uom,
      sku_id: a.sku_id,
    });

    await sql(
      `update lot_balance
       set qty_on_hand = qty_on_hand - $2,
           qty_reserved = greatest(qty_reserved - $2, 0)
       where lot_id = $1 and status = 'AVAILABLE'`,
      [a.lot_id, a.qty],
    );
    await sql(
      `update sales_order_line
       set qty_shipped = qty_shipped + $2,
           qty_reserved = greatest(qty_reserved - $2, 0)
       where id = $1`,
      [a.sales_order_line_id, a.qty],
    );
  }

  await sql(
    `insert into proof_of_delivery (shipment_id, receiver_name, received_at, note)
     values ($1,$2, now(), $3)`,
    [shipment[0].id, input.receiverName, input.note ?? null],
  );

  await sql(`update sales_order set status = 'DELIVERED' where id = $1`, [order.id]);
  await audit(input.actorUserId, "shipment_delivered", "shipment", shipment[0].id);

  // Factura al despacho (§8.3)
  const invoice = await issueInvoiceFromShipment({
    shipmentId: shipment[0].id,
    actorUserId: input.actorUserId,
    shipLines,
  });
  if (!invoice.ok) return invoice;

  return { ok: true, shipmentId: shipment[0].id, invoiceId: invoice.invoiceId };
}

async function issueInvoiceFromShipment(input: {
  shipmentId: string;
  actorUserId: string;
  shipLines: { id: string; unit_price: string; qty: string; description: string; uom: string; sku_id: string }[];
}): Promise<{ ok: true; invoiceId: string } | { ok: false; reason: string }> {
  const shipments = await sql<{ customer_id: string }>(
    `select customer_id from shipment where id = $1`,
    [input.shipmentId],
  );
  const customerId = shipments[0]?.customer_id;
  if (!customerId) return { ok: false, reason: "shipment_missing" };

  const customers = await sql<{
    payment_terms: string;
    tax_rate: string;
  }>(`select payment_terms, tax_rate::text from customer where id = $1`, [customerId]);
  const terms = customers[0]?.payment_terms ?? "NET_30";
  const taxRate = n(customers[0]?.tax_rate ?? 0);
  const netDays =
    terms === "COD" ? 0 : terms === "NET_15" ? 15 : terms === "NET_45" ? 45 : 30;

  let subtotal = n(0);
  const seq = await sql<{ n: string }>(`select nextval('invoice_number_seq')::text as n`);
  const invoiceNumber = `F-${new Date().getFullYear()}-${seq[0].n}`;

  const inv = await sql<{ id: string }>(
    `insert into invoice (
       customer_id, shipment_id, invoice_number, status, issued_at, due_date,
       subtotal, tax_amount, total, amount_paid
     ) values ($1,$2,$3,'DRAFT', current_date, current_date + ($4 || ' days')::interval, 0,0,0,0)
     returning id`,
    [customerId, input.shipmentId, invoiceNumber, String(netDays)],
  );

  for (const line of input.shipLines) {
    const amount = lineAmount(line.unit_price, line.qty);
    subtotal = subtotal.plus(amount);
    await sql(
      `insert into invoice_line (
         invoice_id, shipment_line_id, sku_id, description, uom, qty, unit_price, line_amount
       ) values ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        inv[0].id,
        line.id,
        line.sku_id,
        line.description,
        line.uom,
        line.qty,
        line.unit_price,
        amount,
      ],
    );
  }

  const tax = subtotal.mul(taxRate);
  const total = subtotal.plus(tax);
  await sql(
    `update invoice set status = 'ISSUED', subtotal = $2, tax_amount = $3, total = $4 where id = $1`,
    [inv[0].id, money2(subtotal), money2(tax), money2(total)],
  );

  const pdf = [
    "FACTURA MiccoMed (DEMO) — ESPAÑOL",
    `Número: ${invoiceNumber}`,
    `Emisión: ${new Date().toISOString().slice(0, 10)}`,
    `Subtotal: ${money2(subtotal)}`,
    `Impuesto: ${money2(tax)}`,
    `Total USD: ${money2(total)}`,
    "Documento cliente: sin columnas de costo interno.",
  ].join("\n");
  await sql(
    `insert into document_file (customer_id, doc_type, object_id, label, content_text)
     values ($1,'invoice_pdf',$2,$3,$4)`,
    [customerId, inv[0].id, `${invoiceNumber}.txt`, pdf],
  );

  await audit(input.actorUserId, "invoice_issued", "invoice", inv[0].id);
  return { ok: true, invoiceId: inv[0].id };
}

export async function applyPayment(input: {
  customerId: string;
  invoiceId: string;
  amount: number;
  actorUserId: string;
  reference?: string;
}): Promise<{ ok: true; paymentId: string } | { ok: false; reason: string }> {
  const invoices = await sql<{
    id: string;
    customer_id: string;
    total: string;
    amount_paid: string;
    status: string;
  }>(
    `select id, customer_id, total::text, amount_paid::text, status from invoice where id = $1`,
    [input.invoiceId],
  );
  const inv = invoices[0];
  if (!inv || inv.customer_id !== input.customerId) return { ok: false, reason: "not_found" };
  if (!["ISSUED", "PARTIALLY_PAID"].includes(inv.status)) return { ok: false, reason: "invalid_status" };

  const balance = n(inv.total).minus(inv.amount_paid);
  if (n(input.amount).gt(balance)) return { ok: false, reason: "overpay" };

  const pay = await sql<{ id: string }>(
    `insert into payment (customer_id, amount, method, reference, posted_by)
     values ($1,$2,'ACH',$3,$4) returning id`,
    [input.customerId, money2(input.amount), input.reference ?? null, input.actorUserId],
  );
  await sql(
    `insert into payment_application (payment_id, invoice_id, amount) values ($1,$2,$3)`,
    [pay[0].id, inv.id, money2(input.amount)],
  );
  const newPaid = n(inv.amount_paid).plus(input.amount);
  const status = newPaid.gte(inv.total) ? "PAID" : "PARTIALLY_PAID";
  await sql(`update invoice set amount_paid = $2, status = $3 where id = $1`, [
    inv.id,
    money2(newPaid),
    status,
  ]);
  await audit(input.actorUserId, "payment_posted", "payment", pay[0].id);
  return { ok: true, paymentId: pay[0].id };
}
