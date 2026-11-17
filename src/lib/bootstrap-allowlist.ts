import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Emails autorizados a provisionarse como INTERNAL_ADMIN cuando no hay admins activos.
 * Fuentes (unión, case-insensitive):
 * 1. Secret/env `BOOTSTRAP_ADMIN_EMAIL` (uno o varios separados por coma)
 * 2. `cursor-app.json` → `bootstrapAdminEmails` (allowlist documentada, no secretos)
 */
export function bootstrapAdminAllowlist(): string[] {
  const fromEnv = (process.env.BOOTSTRAP_ADMIN_EMAIL ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  let fromConfig: string[] = [];
  try {
    const raw = readFileSync(path.join(process.cwd(), "cursor-app.json"), "utf8");
    const parsed = JSON.parse(raw) as { bootstrapAdminEmails?: unknown };
    if (Array.isArray(parsed.bootstrapAdminEmails)) {
      fromConfig = parsed.bootstrapAdminEmails
        .filter((e): e is string => typeof e === "string")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);
    }
  } catch {
    // cursor-app.json ausente o inválido → solo env
  }

  return [...new Set([...fromEnv, ...fromConfig])];
}

export function isBootstrapAdminEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;
  return bootstrapAdminAllowlist().includes(normalized);
}
