import Link from "next/link";
import type { SessionUser } from "@/lib/auth";

export function AppChrome({
  session,
  children,
}: {
  session: SessionUser | null;
  children: React.ReactNode;
}) {
  const isClient = session?.plane === "client";
  const isInternal = session?.plane === "internal";

  return (
    <div className="shell">
      <header className="topbar">
        <div>
          <div className="brand">
            Micco<span>Med</span> Portal
          </div>
          <div className="muted" style={{ fontSize: "0.85rem" }}>
            {session
              ? `${session.displayName} · ${session.role}${session.simulated ? " · visor simulado local" : ""}`
              : "Sin sesión provisionada"}
          </div>
        </div>
        <nav className="nav">
          <Link href="/">Inicio</Link>
          {isClient && (
            <>
              <Link href="/portal">Portal</Link>
              <Link href="/portal/catalogo">Catálogo</Link>
              <Link href="/portal/cotizaciones">Cotizaciones</Link>
              <Link href="/portal/pedidos">Pedidos</Link>
              <Link href="/portal/estado-de-cuenta">Estado de cuenta</Link>
            </>
          )}
          {isInternal && (
            <>
              <Link href="/admin">Admin</Link>
              <Link href="/admin/clientes">Clientes</Link>
              <Link href="/admin/catalogo">Catálogo</Link>
              <Link href="/admin/precios">Precios/ULC</Link>
              <Link href="/admin/cotizaciones">Cotizaciones</Link>
              <Link href="/admin/pedidos">Pedidos</Link>
              <Link href="/admin/lotes">Lotes</Link>
              <Link href="/admin/cxc">CxC</Link>
            </>
          )}
        </nav>
      </header>
      <div className="badge">DEMO seed activo</div>
      <div style={{ height: "0.75rem" }} />
      {children}
    </div>
  );
}
