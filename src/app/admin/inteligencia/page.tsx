import { redirect } from "next/navigation";
import { AppChrome } from "@/components/AppChrome";
import { buildIntelDashboard } from "@/lib/intel";
import type { IntelSectionId } from "@/lib/intel/types";
import { getServerSession } from "@/lib/session-server";
import { IntelDashboardClient } from "./IntelDashboardClient";

export const dynamic = "force-dynamic";

const SECTIONS: IntelSectionId[] = [
  "overview",
  "markets",
  "compras",
  "ventas",
  "margenes",
  "gastos",
  "rotacion",
  "clientes",
  "reposicion",
];

export default async function InteligenciaPage({
  searchParams,
}: {
  searchParams: Promise<{ seccion?: string }>;
}) {
  const session = await getServerSession();
  if (!session || session.plane !== "internal") redirect("/");
  const data = buildIntelDashboard();
  const params = await searchParams;
  const raw = params.seccion?.trim() ?? "overview";
  const initialSection = (SECTIONS.includes(raw as IntelSectionId)
    ? raw
    : "overview") as IntelSectionId;

  return (
    <AppChrome session={session}>
      <IntelDashboardClient data={data} initialSection={initialSection} />
    </AppChrome>
  );
}
