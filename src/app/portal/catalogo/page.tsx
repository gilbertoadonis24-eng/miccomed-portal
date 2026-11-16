import { redirect } from "next/navigation";
import { AppChrome } from "@/components/AppChrome";
import { getServerSession } from "@/lib/session-server";
import { CatalogClient } from "./CatalogClient";

export const dynamic = "force-dynamic";

export default async function CatalogoPage() {
  const session = await getServerSession();
  if (!session || session.plane !== "client") redirect("/");
  return (
    <AppChrome session={session}>
      <CatalogClient />
    </AppChrome>
  );
}
