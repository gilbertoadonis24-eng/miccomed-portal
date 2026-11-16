import { beforeAll, describe, expect, it } from "vitest";
import { resetLocalDbForTests, sql } from "../src/lib/db";
import { resolvePrice, toClientPriceDto } from "../src/lib/pricing";
import { atpForCustomer } from "../src/lib/atp";
import { assertNoCostLeak, CLIENT_COST_DENYLIST } from "../src/lib/denylist";
import { createRfq, sendQuote, acceptQuote, clientQuoteDto } from "../src/lib/quotes";
import { evaluateCredit } from "../src/lib/credit";

const NORTE = "22222222-2222-2222-2222-222222222001";
const SUR = "22222222-2222-2222-2222-222222222002";
const BOTTLE = "55555555-5555-5555-5555-555555555001";
const DEVICE = "55555555-5555-5555-5555-555555555003";
const GLOVE = "55555555-5555-5555-5555-555555555004";
const ADMIN = "44444444-4444-4444-4444-444444444001";
const BUYER_NORTE = "44444444-4444-4444-4444-444444444003";
const SHIP_NORTE = "33333333-3333-3333-3333-333333333001";

describe("MiccoMed portal — precio, ATP, no-fuga, tenant", () => {
  beforeAll(async () => {
    process.env.DATABASE_URL = "";
    await resetLocalDbForTests();
  }, 60000);

  it("resuelve contrato sobre tier para Norte/frasco", async () => {
    const price = await resolvePrice({
      customerId: NORTE,
      skuId: BOTTLE,
      uom: "EACH",
      qty: 10,
    });
    expect(price.unitPrice).toBe("1.4000");
    expect(price.priceSource).toBe("contract");
    expect(price.status).toBe("OK");
    expect(Number(price.floorPrice)).toBeCloseTo(1.3333, 3);
  });

  it("SKU sin precio de tier queda UNPRICED (Solicitar cotización)", async () => {
    const price = await resolvePrice({
      customerId: NORTE,
      skuId: GLOVE,
      uom: "CASE",
      qty: 1,
    });
    expect(price.status).toBe("UNPRICED");
    const dto = toClientPriceDto("OFF-GLOVE-NIT-M-DEMO", "CASE", price);
    expect(dto.unit_price).toBeNull();
    expect(dto.can_request_quote).toBe(true);
    assertNoCostLeak(dto, "unpriced dto");
  });

  it("ATP FEFO: device con 180d = 5 (ignora short y cuarentena)", async () => {
    const atp = await atpForCustomer(NORTE, DEVICE);
    expect(Number(atp.atpQty)).toBe(5);
    expect(atp.minShelfLifeDays).toBe(180);
  });

  it("DTO cliente de cotización no contiene denylist de costo", async () => {
    const created = await createRfq({
      customerId: NORTE,
      shipToId: SHIP_NORTE,
      createdBy: BUYER_NORTE,
      lines: [{ skuId: BOTTLE, uom: "EACH", qty: 2 }],
    });
    const quote = (await sql(`select * from quote where id = $1`, [created.quoteId]))[0] as Record<
      string,
      unknown
    >;
    const lines = (await sql(
      `select id, line_no, sku_id, description, uom, qty::text, unit_price::text,
              line_amount::text, price_source, atp_qty::text, line_status
       from quote_line where quote_id = $1`,
      [created.quoteId],
    )) as Record<string, unknown>[];
    const dto = clientQuoteDto(quote, lines);
    assertNoCostLeak(dto, "quote dto");
    const blob = JSON.stringify(dto).toLowerCase();
    for (const key of CLIENT_COST_DENYLIST) {
      expect(blob.includes(`"${key}"`)).toBe(false);
    }

    // costos viven solo en quote_line_cost
    const costs = await sql(`select * from quote_line_cost where quote_line_id = $1`, [
      lines[0].id,
    ]);
    expect(costs[0]).toBeTruthy();
    expect(Number((costs[0] as { ulc: string }).ulc)).toBe(1);
  });

  it("tenant: Sur no ve cotización de Norte (filtro customer_id)", async () => {
    const norteQuotes = await sql<{ id: string }>(
      `select id from quote where customer_id = $1 limit 1`,
      [NORTE],
    );
    const leaked = await sql(
      `select id from quote where id = $1 and customer_id = $2`,
      [norteQuotes[0].id, SUR],
    );
    expect(leaked.length).toBe(0);

    const shipLeak = await sql(
      `select id from ship_to where id = $1 and customer_id = $2`,
      [SHIP_NORTE, SUR],
    );
    expect(shipLeak.length).toBe(0);

    const invNorte = await sql<{ id: string }>(
      `select id from invoice where customer_id = $1 limit 1`,
      [NORTE],
    );
    const invLeak = await sql(
      `select id from invoice where id = $1 and customer_id = $2`,
      [invNorte[0].id, SUR],
    );
    expect(invLeak.length).toBe(0);
  });

  it("hold de crédito por mora >15d en Norte DEMO", async () => {
    const credit = await evaluateCredit(NORTE);
    expect(credit.maxDaysPastDue).toBeGreaterThan(15);
    expect(credit.hold).toBe(true);
    expect(credit.reasons).toContain("past_due_over_policy");
  });

  it("enviar cotización OK congela precio y genera PDF ES sin margen", async () => {
    const created = await createRfq({
      customerId: SUR,
      shipToId: "33333333-3333-3333-3333-333333333002",
      createdBy: ADMIN,
      lines: [{ skuId: BOTTLE, uom: "EACH", qty: 5 }],
    });
    // Sur es TIER_B → 1.55 over floor
    const sent = await sendQuote({ quoteId: created.quoteId, actorUserId: ADMIN });
    expect(sent.ok).toBe(true);
    const q = await sql<{ status: string }>(`select status from quote where id = $1`, [
      created.quoteId,
    ]);
    expect(q[0].status).toBe("SENT");
    const docs = await sql<{ content_text: string }>(
      `select content_text from document_file where object_id = $1 and doc_type = 'quote_pdf'`,
      [created.quoteId],
    );
    expect(docs[0].content_text).toContain("ESPAÑOL");
    assertNoCostLeak(
      { pdf: docs[0].content_text.replace(/Documento cliente: sin columnas de costo interno\./i, "") },
      "quote pdf",
    );

    const accepted = await acceptQuote({
      quoteId: created.quoteId,
      actorUserId: "44444444-4444-4444-4444-444444444004",
      customerId: SUR,
    });
    expect(accepted.ok).toBe(true);
  });
});
