import { redirect } from "next/navigation";
import { AppChrome } from "@/components/AppChrome";
import { getServerSession } from "@/lib/session-server";
import { ArClient } from "./ArClient";

export const dynamic = "force-dynamic";

export default async function CxcPage() {
  const session = await getServerSession();
  if (!session || session.plane !== "internal") redirect("/");
  return (
    <AppChrome session={session}>
      <ArClient />
    </AppChrome>
  );
}
