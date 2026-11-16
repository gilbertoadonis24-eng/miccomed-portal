import { redirect } from "next/navigation";
import { AppChrome } from "@/components/AppChrome";
import { getServerSession } from "@/lib/session-server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function CuentaPage() {
  const session = await getServerSession();
  if (!session || session.plane !== "client") redirect("/");
  const customers = await sql(
    `select code, legal_name, trade_name, tier, payment_terms, min_shelf_life_days, is_demo
     from customer where id = $1`,
    [session.customerId],
  );
  const shipTos = await sql(
    `select name, address_line1, city, state, postal_code from ship_to where customer_id = $1`,
    [session.customerId],
  );
  return (
    <AppChrome session={session}>
      <section className="panel">
        <h1>Cuenta</h1>
        <pre>{JSON.stringify({ customer: customers[0], ship_tos: shipTos }, null, 2)}</pre>
      </section>
    </AppChrome>
  );
}
