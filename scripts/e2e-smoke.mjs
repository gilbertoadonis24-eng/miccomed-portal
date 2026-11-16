import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

// Run compiled TS via dynamic import after registering tsx
const { register } = await import("tsx/esm/api");
register();

const { resetLocalDbForTests } = await import("../src/lib/db.ts");
const { createRfq, sendQuote, acceptQuote } = await import("../src/lib/quotes.ts");
const { convertAcceptedQuote } = await import("../src/lib/orders.ts");
const { shipOrder } = await import("../src/lib/fulfillment.ts");
const { atpForCustomer } = await import("../src/lib/atp.ts");

process.env.DATABASE_URL = "";
await resetLocalDbForTests();

const SUR = "22222222-2222-2222-2222-222222222002";
const SHIP = "33333333-3333-3333-3333-333333333002";
const BOTTLE = "55555555-5555-5555-5555-555555555001";
const ADMIN = "44444444-4444-4444-4444-444444444001";
const BUYER = "44444444-4444-4444-4444-444444444004";

const atp = await atpForCustomer(SUR, BOTTLE);
const rfq = await createRfq({
  customerId: SUR,
  shipToId: SHIP,
  createdBy: BUYER,
  lines: [{ skuId: BOTTLE, uom: "EACH", qty: 3 }],
});
const sent = await sendQuote({ quoteId: rfq.quoteId, actorUserId: ADMIN });
const acc = await acceptQuote({
  quoteId: rfq.quoteId,
  actorUserId: BUYER,
  customerId: SUR,
});
const ov = await convertAcceptedQuote({
  quoteId: rfq.quoteId,
  actorUserId: ADMIN,
  customerPoNumber: "PO-E2E-1",
  acceptBackorder: true,
});
let ship = null;
if (ov.ok) {
  ship = await shipOrder({
    orderId: ov.orderId,
    actorUserId: ADMIN,
    receiverName: "Receptor E2E",
  });
}
console.log(JSON.stringify({ atp: atp.atpQty, rfq, sent, acc, ov, ship }, null, 2));
if (!sent.ok || !acc.ok || !ov.ok || !ship?.ok) process.exit(1);
