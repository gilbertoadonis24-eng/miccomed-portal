/** Claves prohibidas en respuestas/HTML/PDF del plano cliente. */
export const CLIENT_COST_DENYLIST = [
  "ulc",
  "margin",
  "margin_pct",
  "floor",
  "min_price",
  "cost",
  "fob",
  "duty",
  "landed",
  "supplier_cost",
] as const;

export function assertNoCostLeak(payload: unknown, context: string): void {
  const text = JSON.stringify(payload).toLowerCase();
  for (const key of CLIENT_COST_DENYLIST) {
    // match as JSON key-ish or bare field names, not substrings inside words like "customer"
    const patterns = [
      `"${key}"`,
      `'${key}'`,
      `${key}:`,
      `${key}=`,
    ];
    if (patterns.some((p) => text.includes(p))) {
      throw new Error(`Fuga de costo denylist (${key}) en ${context}`);
    }
  }
}

export function scrubClientDto<T extends Record<string, unknown>>(row: T): T {
  const out = { ...row };
  for (const key of Object.keys(out)) {
    const lower = key.toLowerCase();
    if ((CLIENT_COST_DENYLIST as readonly string[]).includes(lower)) {
      delete out[key];
    }
  }
  return out;
}
