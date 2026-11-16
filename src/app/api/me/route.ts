import { resolveSession } from "@/lib/auth";
import { json } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await resolveSession(request);
  if (session instanceof Response) return session;
  return json({
    id: session.id,
    email: session.email,
    displayName: session.displayName,
    role: session.role,
    customerId: session.customerId,
    plane: session.plane,
    permissions: session.permissions,
    simulated: session.simulated,
  });
}
