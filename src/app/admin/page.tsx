import Link from "next/link";
import { redirect } from "next/navigation";
import { AppChrome } from "@/components/AppChrome";
import { getServerSession } from "@/lib/session-server";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const session = await getServerSession();
  if (!session || session.plane !== "internal") redirect("/");
  return (
    <AppChrome session={session}>
      <section className="panel">
        <h1>Admin MiccoMed</h1>
        <p className="muted">
          Staff ve todas las cuentas (§8.5). Flags de permiso controlan pantallas sensibles.
        </p>
        <div className="grid">
          {[
            ["/admin/clientes", "Clientes"],
            ["/admin/catalogo", "SKUs"],
            ["/admin/precios", "ULC / tiers"],
            ["/admin/cotizaciones", "Cotizaciones"],
            ["/admin/pedidos", "Pedidos / despacho"],
            ["/admin/lotes", "Lotes"],
            ["/admin/cxc", "CxC / pagos"],
          ].map(([href, label]) => (
            <Link key={href} className="panel" href={href}>
              <strong>{label}</strong>
            </Link>
          ))}
        </div>
      </section>
    </AppChrome>
  );
}
