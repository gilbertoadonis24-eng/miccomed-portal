import Link from "next/link";
import { AppChrome } from "@/components/AppChrome";
import { getServerSession } from "@/lib/session-server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getServerSession();

  return (
    <AppChrome session={session}>
      <section className="panel">
        <h1>Portal clientes MiccoMed</h1>
        <p className="hero-copy muted">
          Vertical slice quote-to-cash: catálogo con precio de cuenta, RFQ, cotización congelada,
          OV con ATP FEFO, despacho con POD, factura al embarque y estado de cuenta con mora.
          Los datos marcados DEMO son ficticios para demos y tests de no-fuga.
        </p>
        {!session && (
          <p className="danger">
            No hay sesión de portal para este visor Cursor. El primer acceso verificado provisiona un
            INTERNAL_ADMIN automáticamente si aún no hay admins activos; si ya hay admins, el email
            debe estar invitado en <code>app_user</code>. En local usa el seed DEMO (p. ej.{" "}
            <code>admin@miccomed.demo</code>).
          </p>
        )}
        {session?.plane === "internal" && (
          <p>
            <Link className="btn" href="/admin">
              Ir a Admin
            </Link>
          </p>
        )}
        {session?.plane === "client" && (
          <p>
            <Link className="btn" href="/portal">
              Ir al portal
            </Link>
          </p>
        )}
      </section>
      {session?.plane === "internal" && (
        <section className="panel">
          <h2>Credenciales DEMO (seed)</h2>
          <table>
            <thead>
              <tr>
                <th>Email (identidad Cursor)</th>
                <th>Rol</th>
                <th>Cuenta</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>admin@miccomed.demo / dev@example.com</td>
                <td>INTERNAL_ADMIN</td>
                <td>—</td>
              </tr>
              <tr>
                <td>staff@miccomed.demo</td>
                <td>INTERNAL_STAFF (todos los flags)</td>
                <td>—</td>
              </tr>
              <tr>
                <td>comprador@farmacia-norte.demo</td>
                <td>CLIENT_USER</td>
                <td>DEMO-NORTE</td>
              </tr>
              <tr>
                <td>ap@clinica-sur.demo</td>
                <td>CLIENT_USER</td>
                <td>DEMO-SUR</td>
              </tr>
            </tbody>
          </table>
          <p className="muted">
            Solo visible al plano interno. Auth = gate Cursor Apps + mapeo por email.
          </p>
        </section>
      )}
    </AppChrome>
  );
}
