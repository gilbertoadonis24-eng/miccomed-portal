import { sql } from "./db";
import { n } from "./money";

/** Defaults §8.2: hold si mora máxima > 15 días O exposición > límite. */
export const MORA_HOLD_DAYS = 15;

export type CreditCheck = {
  hold: boolean;
  reasons: string[];
  exposure: string;
  creditLimit: string;
  maxDaysPastDue: number;
  creditStatus: string;
};

export async function evaluateCredit(customerId: string): Promise<CreditCheck> {
  const customers = await sql<{
    credit_limit: string;
    credit_status: string;
  }>(
    `select credit_limit::text, credit_status from customer where id = $1`,
    [customerId],
  );
  const customer = customers[0];
  if (!customer) {
    return {
      hold: true,
      reasons: ["customer_missing"],
      exposure: "0.00",
      creditLimit: "0.00",
      maxDaysPastDue: 0,
      creditStatus: "HOLD",
    };
  }

  const openAr = await sql<{ balance: string; max_dpd: number }>(
    `select
       coalesce(sum(greatest(total - amount_paid, 0)), 0)::text as balance,
       coalesce(max(
         case when total - amount_paid > 0 and due_date < current_date
           then (current_date - due_date)
           else 0 end
       ), 0)::int as max_dpd
     from invoice
     where customer_id = $1
       and status in ('ISSUED', 'PARTIALLY_PAID')`,
    [customerId],
  );

  const uninvoiced = await sql<{ amount: string }>(
    `select coalesce(sum(sol.unit_price * (sol.qty_ordered - sol.qty_shipped)), 0)::text as amount
     from sales_order so
     join sales_order_line sol on sol.sales_order_id = so.id
     where so.customer_id = $1
       and so.status in ('CONFIRMED', 'PARTIALLY_ALLOCATED', 'ALLOCATED', 'PICKING', 'PARTIALLY_SHIPPED')`,
    [customerId],
  );

  const ar = n(openAr[0]?.balance ?? 0);
  const openOrders = n(uninvoiced[0]?.amount ?? 0);
  const exposure = ar.plus(openOrders);
  const limit = n(customer.credit_limit);
  const maxDpd = Number(openAr[0]?.max_dpd ?? 0);
  const reasons: string[] = [];

  if (customer.credit_status === "HOLD") reasons.push("credit_status_hold");
  if (customer.credit_status === "COD") reasons.push("credit_status_cod");
  if (exposure.gt(limit)) reasons.push("over_limit");
  if (maxDpd > MORA_HOLD_DAYS) reasons.push("past_due_over_policy");

  return {
    hold: reasons.length > 0,
    reasons,
    exposure: exposure.toFixed(2),
    creditLimit: limit.toFixed(2),
    maxDaysPastDue: maxDpd,
    creditStatus: customer.credit_status,
  };
}

export async function daysPastDue(invoiceId: string): Promise<number> {
  const rows = await sql<{ dpd: number }>(
    `select case
       when total - amount_paid <= 0 then 0
       when due_date is null then 0
       when due_date >= current_date then 0
       else (current_date - due_date)
     end::int as dpd
     from invoice where id = $1`,
    [invoiceId],
  );
  return Number(rows[0]?.dpd ?? 0);
}
