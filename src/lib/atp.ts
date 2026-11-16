import { sql } from "./db";
import { n } from "./money";

export type AtpResult = {
  skuId: string;
  customerId: string;
  atpQty: string;
  minShelfLifeDays: number;
};

/** ATP vendible: AVAILABLE + dating del cliente − reservado. Sin filtrar por lotes crudos al cliente. */
export async function atpForCustomer(
  customerId: string,
  skuId: string,
  onDate?: string,
): Promise<AtpResult> {
  const today = onDate ?? new Date().toISOString().slice(0, 10);

  const customers = await sql<{
    min_shelf_life_days: number;
  }>(
    `select coalesce(
       (select min_shelf_life_days from customer_contract
        where customer_id = $1 and status = 'ACTIVE'
          and effective_from <= $2::date
          and (effective_to is null or effective_to >= $2::date)
          and min_shelf_life_days is not null
        order by effective_from desc limit 1),
       c.min_shelf_life_days
     ) as min_shelf_life_days
     from customer c where c.id = $1`,
    [customerId, today],
  );
  const minDays = customers[0]?.min_shelf_life_days ?? 180;

  const skus = await sql<{ dated: boolean }>(
    `select dated from sku where id = $1`,
    [skuId],
  );
  const dated = skus[0]?.dated ?? true;

  const rows = await sql<{ qty: string }>(
    dated
      ? `select coalesce(sum(lb.qty_on_hand - lb.qty_reserved), 0)::text as qty
         from lot_balance lb
         join lot l on l.id = lb.lot_id
         where l.sku_id = $1
           and lb.status = 'AVAILABLE'
           and (lb.qty_on_hand - lb.qty_reserved) > 0
           and (
             l.expiry_date is null
             or l.expiry_date >= ($2::date + ($3 || ' days')::interval)
           )`
      : `select coalesce(sum(lb.qty_on_hand - lb.qty_reserved), 0)::text as qty
         from lot_balance lb
         join lot l on l.id = lb.lot_id
         where l.sku_id = $1
           and lb.status = 'AVAILABLE'
           and (lb.qty_on_hand - lb.qty_reserved) > 0`,
    dated ? [skuId, today, String(minDays)] : [skuId],
  );

  return {
    skuId,
    customerId,
    atpQty: n(rows[0]?.qty ?? 0).toFixed(4),
    minShelfLifeDays: minDays,
  };
}

export type FefoAllocation = {
  lotId: string;
  lotCode: string;
  expiryDate: string | null;
  qty: string;
};

/** Reserva FEFO sobre lotes AVAILABLE que cumplen dating. */
export async function allocateFefo(input: {
  customerId: string;
  skuId: string;
  qty: number;
  salesOrderLineId: string;
}): Promise<{ allocations: FefoAllocation[]; backorderQty: string }> {
  const atpMeta = await atpForCustomer(input.customerId, input.skuId);
  const today = new Date().toISOString().slice(0, 10);

  const skus = await sql<{ dated: boolean }>(
    `select dated from sku where id = $1`,
    [input.skuId],
  );
  const dated = skus[0]?.dated ?? true;

  const lots = await sql<{
    lot_id: string;
    lot_code: string;
    expiry_date: string | null;
    available: string;
    balance_id: string;
  }>(
    dated
      ? `select l.id as lot_id, l.lot_code, l.expiry_date::text, lb.id as balance_id,
                (lb.qty_on_hand - lb.qty_reserved)::text as available
         from lot_balance lb
         join lot l on l.id = lb.lot_id
         where l.sku_id = $1
           and lb.status = 'AVAILABLE'
           and (lb.qty_on_hand - lb.qty_reserved) > 0
           and (
             l.expiry_date is null
             or l.expiry_date >= ($2::date + ($3 || ' days')::interval)
           )
         order by l.expiry_date nulls last, l.received_at, l.lot_code`
      : `select l.id as lot_id, l.lot_code, l.expiry_date::text, lb.id as balance_id,
                (lb.qty_on_hand - lb.qty_reserved)::text as available
         from lot_balance lb
         join lot l on l.id = lb.lot_id
         where l.sku_id = $1
           and lb.status = 'AVAILABLE'
           and (lb.qty_on_hand - lb.qty_reserved) > 0
         order by l.received_at, l.lot_code`,
    dated
      ? [input.skuId, today, String(atpMeta.minShelfLifeDays)]
      : [input.skuId],
  );

  let remaining = n(input.qty);
  const allocations: FefoAllocation[] = [];

  for (const lot of lots) {
    if (remaining.lte(0)) break;
    const avail = n(lot.available);
    if (avail.lte(0)) continue;
    const take = DecimalMin(remaining, avail);
    await sql(
      `update lot_balance set qty_reserved = qty_reserved + $2 where id = $1`,
      [lot.balance_id, take.toFixed(4)],
    );
    await sql(
      `insert into allocation (sales_order_line_id, lot_id, qty) values ($1, $2, $3)`,
      [input.salesOrderLineId, lot.lot_id, take.toFixed(4)],
    );
    allocations.push({
      lotId: lot.lot_id,
      lotCode: lot.lot_code,
      expiryDate: lot.expiry_date,
      qty: take.toFixed(4),
    });
    remaining = remaining.minus(take);
  }

  return {
    allocations,
    backorderQty: remaining.toFixed(4),
  };
}

function DecimalMin(a: ReturnType<typeof n>, b: ReturnType<typeof n>) {
  return a.lt(b) ? a : b;
}
