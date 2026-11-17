/**
 * Emails autorizados a provisionarse como INTERNAL_ADMIN cuando no hay admins activos.
 * Solo secret/env `BOOTSTRAP_ADMIN_EMAIL` (uno o varios separados por coma).
 * No se lee allowlist desde archivos shippeados.
 */
export function bootstrapAdminAllowlist(): string[] {
  const fromEnv = (process.env.BOOTSTRAP_ADMIN_EMAIL ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set(fromEnv)];
}

export function isBootstrapAdminEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;
  return bootstrapAdminAllowlist().includes(normalized);
}
