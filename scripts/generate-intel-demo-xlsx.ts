/**
 * Genera public/intel-demo/*.xlsx (10 filas por dominio).
 * Uso: npx tsx scripts/generate-intel-demo-xlsx.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { EXCEL_DOMAINS } from "../src/lib/intel/excel-domains";
import {
  assertTemplateRowCounts,
  buildDemoWorkbook,
} from "../src/lib/intel/excel";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "public", "intel-demo");

assertTemplateRowCounts();
mkdirSync(outDir, { recursive: true });

for (const meta of Object.values(EXCEL_DOMAINS)) {
  const buf = buildDemoWorkbook(meta.id);
  const path = join(outDir, meta.fileName);
  writeFileSync(path, Buffer.from(buf));
  console.log("wrote", path);
}

console.log("OK — plantillas intel-demo generadas.");
