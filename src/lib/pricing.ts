import { sql } from "./db";
import { n, price4 } from "./money";

export type PriceStatus =
  | "OK"
  | "BELOW_FLOOR"
  | "NO_COST"
  | "NO_POLICY"
  | "UNPRICED";

export type InternalPriceResult = {
  unitPrice: string | null;
  priceSource: "beats_contract" | "contract" | "override" | "tier" | null;
  priceSourceLabel: string | null;
  priceListItemId: string | null;
  contractLineId: string | null;
  overrideId: string | null;
  ulcRecordId: string | null;
  ulc: string | null;
  floorPrice: string | null;
  marginPct: string | null;
  status: PriceStatus;
};

export type ClientPriceDto = {
  sku: string;
  uom: string;
  unit_price: string | null;
  currency: "USD";
  price_source: string | null;
  valid_until: string | null;
  can_request_quote: boolean;
};

type Candidate = {
  unitPrice: string;
  source: InternalPriceResult["priceSource"];
  priceListItemId: string | null;
  contractLineId: string | null;
  overrideId: string | null;
};

function humanSource(source: InternalPriceResult["priceSource"]): string | null {
  if (source === "contract" || source === "beats_contract") return "Contrato";
  if (source === "override") return "Precio acordado";
  if (source === "tier") return "Lista de cuenta";
  return null;
}

export async function resolvePrice(input: {
  customerId: string;
  skuId: string;
  uom: string;
  qty: number;
  onDate?: string;
}): Promise<InternalPriceResult> {
  const onDate = input.onDate ?? new Date().toISOString().slice(0, 10);
  const qty = input.qty;

  const customers = await sql<{
    tier: string;
  }>(`select tier from customer where id = $1`, [input.customerId]);
  const customer = customers[0];
  if (!customer) {
    return empty("UNPRICED");
  }

  // 1) override beats_contract
  const beats = await sql<{
    id: string;
    unit_price: string;
  }>(
    `select id, unit_price::text
     from customer_price_override
     where customer_id = $1 and sku_id = $2 and uom = $3 and active = true
       and beats_contract = true
       and effective_from <= $4::date
       and (effective_to is null or effective_to >= $4::date)
     order by effective_from desc
     limit 1`,
    [input.customerId, input.skuId, input.uom, onDate],
  );

  let candidate: Candidate | null = null;
  if (beats[0]) {
    candidate = {
      unitPrice: price4(beats[0].unit_price),
      source: "beats_contract",
      priceListItemId: null,
      contractLineId: null,
      overrideId: beats[0].id,
    };
  }

  // 2) contract line
  if (!candidate) {
    const contracts = await sql<{
      id: string;
      unit_price: string;
    }>(
      `select cl.id, cl.unit_price::text
       from customer_contract cc
       join contract_line cl on cl.contract_id = cc.id
       where cc.customer_id = $1 and cc.status = 'ACTIVE'
         and cc.effective_from <= $4::date
         and (cc.effective_to is null or cc.effective_to >= $4::date)
         and cl.sku_id = $2 and cl.uom = $3 and cl.min_qty <= $5
       order by cl.min_qty desc
       limit 1`,
      [input.customerId, input.skuId, input.uom, onDate, qty],
    );
    if (contracts[0]) {
      candidate = {
        unitPrice: price4(contracts[0].unit_price),
        source: "contract",
        priceListItemId: null,
        contractLineId: contracts[0].id,
        overrideId: null,
      };
    }
  }

  // 3) regular override
  if (!candidate) {
    const overrides = await sql<{
      id: string;
      unit_price: string;
    }>(
      `select id, unit_price::text
       from customer_price_override
       where customer_id = $1 and sku_id = $2 and uom = $3 and active = true
         and beats_contract = false
         and effective_from <= $4::date
         and (effective_to is null or effective_to >= $4::date)
       order by effective_from desc
       limit 1`,
      [input.customerId, input.skuId, input.uom, onDate],
    );
    if (overrides[0]) {
      candidate = {
        unitPrice: price4(overrides[0].unit_price),
        source: "override",
        priceListItemId: null,
        contractLineId: null,
        overrideId: overrides[0].id,
      };
    }
  }

  // 4) tier list
  if (!candidate) {
    const items = await sql<{
      id: string;
      unit_price: string;
    }>(
      `select pli.id, pli.unit_price::text
       from price_list pl
       join price_list_item pli on pli.price_list_id = pl.id
       where pl.tier = $1
         and pl.effective_from <= $4::date
         and (pl.effective_to is null or pl.effective_to >= $4::date)
         and pli.sku_id = $2 and pli.uom = $3 and pli.min_qty <= $5
       order by pl.effective_from desc, pli.min_qty desc
       limit 1`,
      [customer.tier, input.skuId, input.uom, onDate, qty],
    );
    if (items[0]) {
      candidate = {
        unitPrice: price4(items[0].unit_price),
        source: "tier",
        priceListItemId: items[0].id,
        contractLineId: null,
        overrideId: null,
      };
    }
  }

  if (!candidate) {
    return empty("UNPRICED");
  }

  const ulcRows = await sql<{
    id: string;
    ulc: string;
  }>(
    `select id, ulc::text from ulc_record
     where sku_id = $1 and effective_from <= $2::date
     order by effective_from desc limit 1`,
    [input.skuId, onDate],
  );
  const ulc = ulcRows[0];
  if (!ulc) {
    return {
      unitPrice: candidate.unitPrice,
      priceSource: candidate.source,
      priceSourceLabel: humanSource(candidate.source),
      priceListItemId: candidate.priceListItemId,
      contractLineId: candidate.contractLineId,
      overrideId: candidate.overrideId,
      ulcRecordId: null,
      ulc: null,
      floorPrice: null,
      marginPct: null,
      status: "NO_COST",
    };
  }

  const skus = await sql<{ category_id: string }>(
    `select category_id from sku where id = $1`,
    [input.skuId],
  );
  const categoryId = skus[0]?.category_id ?? null;
  const policies = await sql<{ min_margin_pct: string }>(
    `select min_margin_pct::text from margin_policy
     where effective_from <= $1::date
       and (effective_to is null or effective_to >= $1::date)
       and (category_id is null or category_id = $2)
     order by case when category_id is null then 1 else 0 end, effective_from desc
     limit 1`,
    [onDate, categoryId],
  );
  const policy = policies[0];
  if (!policy) {
    return {
      unitPrice: candidate.unitPrice,
      priceSource: candidate.source,
      priceSourceLabel: humanSource(candidate.source),
      priceListItemId: candidate.priceListItemId,
      contractLineId: candidate.contractLineId,
      overrideId: candidate.overrideId,
      ulcRecordId: ulc.id,
      ulc: price4(ulc.ulc),
      floorPrice: null,
      marginPct: null,
      status: "NO_POLICY",
    };
  }

  const minMargin = n(policy.min_margin_pct);
  const ulcN = n(ulc.ulc);
  const floor = ulcN.div(n(1).minus(minMargin));
  const price = n(candidate.unitPrice);
  const marginPct = price.isZero()
    ? n(0)
    : price.minus(ulcN).div(price);
  const below = price.lt(floor);

  return {
    unitPrice: candidate.unitPrice,
    priceSource: candidate.source,
    priceSourceLabel: humanSource(candidate.source),
    priceListItemId: candidate.priceListItemId,
    contractLineId: candidate.contractLineId,
    overrideId: candidate.overrideId,
    ulcRecordId: ulc.id,
    ulc: price4(ulc.ulc),
    floorPrice: price4(floor),
    marginPct: marginPct.toDecimalPlaces(4).toFixed(4),
    status: below ? "BELOW_FLOOR" : "OK",
  };
}

function empty(status: PriceStatus): InternalPriceResult {
  return {
    unitPrice: null,
    priceSource: null,
    priceSourceLabel: null,
    priceListItemId: null,
    contractLineId: null,
    overrideId: null,
    ulcRecordId: null,
    ulc: null,
    floorPrice: null,
    marginPct: null,
    status,
  };
}

export function toClientPriceDto(
  skuCode: string,
  uom: string,
  result: InternalPriceResult,
  validUntil: string | null = null,
): ClientPriceDto {
  const ok = result.status === "OK" && result.unitPrice != null;
  return {
    sku: skuCode,
    uom,
    unit_price: ok ? result.unitPrice : null,
    currency: "USD",
    price_source: ok ? result.priceSourceLabel : null,
    valid_until: ok ? validUntil : null,
    can_request_quote: !ok,
  };
}
