import { redirect } from "next/navigation";
import { AppChrome } from "@/components/AppChrome";
import { getServerSession } from "@/lib/session-server";
import { AdminQuotesClient } from "./AdminQuotesClient";

export const dynamic = "force-dynamic";

export default async function AdminCotizacionesPage() {
  const session = await getServerSession();
  if (!session || session.plane !== "internal") redirect("/");
  return (
    <AppChrome session={session}>
      <AdminQuotesClient canViewCost={session.permissions.includes("view_cost") || session.role === "INTERNAL_ADMIN"} />
    </AppChrome>
  );
}
