import { redirect } from "next/navigation";
import { AppChrome } from "@/components/AppChrome";
import { getServerSession } from "@/lib/session-server";
import { QuotesClient } from "./QuotesClient";

export const dynamic = "force-dynamic";

export default async function CotizacionesPage() {
  const session = await getServerSession();
  if (!session || session.plane !== "client") redirect("/");
  return (
    <AppChrome session={session}>
      <QuotesClient />
    </AppChrome>
  );
}
