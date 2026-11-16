import { redirect } from "next/navigation";
import { AppChrome } from "@/components/AppChrome";
import { getServerSession } from "@/lib/session-server";
import { sql } from "@/lib/db";
import { ArClient } from "./ArClient";

export const dynamic = "force-dynamic";

export default async function CxcPage() {
  const session = await getServerSession();
  if (!session || session.plane !== "internal") redirect("/");

  const invoices = await sql(
    `select i.id, i.invoice_number, i.status, i.due_date::text, i.total::text, i.amount_paid::text,
            greatest(i.total - i.amount_paid, 0)::text as balance,
            case
              when i.total - i.amount_paid <= 0 then 0
              when i.due_date >= current_date then 0
              else (current_date - i.due_date)
            end::int as days_past_due,
            c.code as customer_code, c.internal_ar_notes, i.is_demo
     from invoice i join customer c on c.id = i.customer_id
     where i.status in ('DRAFT','ISSUED','PARTIALLY_PAID','PAID')
     order by i.due_date nulls last`,
  );
  const aging = await sql(
    `select
       sum(case when dpd between 1 and 30 then bal else 0 end)::text as b_1_30,
       sum(case when dpd between 31 and 60 then bal else 0 end)::text as b_31_60,
       sum(case when dpd between 61 and 90 then bal else 0 end)::text as b_61_90,
       sum(case when dpd > 90 then bal else 0 end)::text as b_90_plus
     from (
       select greatest(total - amount_paid, 0) as bal,
              case when total - amount_paid <= 0 then 0
                   when due_date >= current_date then 0
                   else (current_date - due_date) end as dpd
       from invoice where status in ('ISSUED','PARTIALLY_PAID')
     ) x`,
  );

  return (
    <AppChrome session={session}>
      <section className="panel stack">
        <h1>Cuentas por cobrar</h1>
        {aging[0] && (
          <p className="muted">
            Aging: 1–30 {String(aging[0].b_1_30)} · 31–60 {String(aging[0].b_31_60)} · 61–90{" "}
            {String(aging[0].b_61_90)} · 90+ {String(aging[0].b_90_plus)}
          </p>
        )}
        <table>
          <thead>
            <tr>
              <th>Factura</th>
              <th>Cliente</th>
              <th>Saldo</th>
              <th>Mora</th>
              <th>Notas AR</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((i) => (
              <tr key={String(i.id)}>
                <td>
                  {String(i.invoice_number)}{" "}
                  {i.is_demo ? <span className="badge">DEMO</span> : null}
                </td>
                <td>{String(i.customer_code)}</td>
                <td>${String(i.balance)}</td>
                <td className={Number(i.days_past_due) > 0 ? "danger" : ""}>
                  {String(i.days_past_due)}d
                </td>
                <td className="muted">{String(i.internal_ar_notes ?? "")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <ArClient
        invoices={invoices.map((i) => ({
          id: String(i.id),
          invoice_number: String(i.invoice_number),
          customer_code: String(i.customer_code),
          balance: String(i.balance),
          days_past_due: Number(i.days_past_due),
        }))}
      />
    </AppChrome>
  );
}
