import { headers } from "next/headers";
import { resolveSession, type SessionUser } from "./auth";

export async function getServerSession(): Promise<SessionUser | null> {
  const h = await headers();
  const req = new Request("http://local.internal/session", { headers: h });
  const session = await resolveSession(req);
  if (session instanceof Response) return null;
  return session;
}
