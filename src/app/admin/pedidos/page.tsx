import { redirect } from "next/navigation";
import { AppChrome } from "@/components/AppChrome";
import { getServerSession } from "@/lib/session-server";
import { AdminOrdersClient } from "./AdminOrdersClient";

export const dynamic = "force-dynamic";

export default async function AdminPedidosPage() {
  const session = await getServerSession();
  if (!session || session.plane !== "internal") redirect("/");
  return (
    <AppChrome session={session}>
      <AdminOrdersClient />
    </AppChrome>
  );
}
