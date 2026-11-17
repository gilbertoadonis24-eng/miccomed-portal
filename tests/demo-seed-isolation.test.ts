import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { resetLocalDbForTests, sql } from "../src/lib/db";

describe("DEMO seed isolation (prod vs PGlite)", () => {
  beforeAll(async () => {
    process.env.DATABASE_URL = "";
    await resetLocalDbForTests();
  }, 60000);

  it("migrations/ no incluye seed DEMO; seeds/ sí", async () => {
    const mig = await readdir(path.join(process.cwd(), "migrations"));
    const seedFiles = await readdir(path.join(process.cwd(), "seeds"));
    expect(mig.some((f) => /seed/i.test(f))).toBe(false);
    expect(mig).toContain("001_schema.sql");
    expect(mig).toContain("003_disable_demo_data.sql");
    expect(seedFiles.some((f) => f.endsWith(".sql"))).toBe(true);
  });

  it("migrate.mjs solo lista SQL de migrations/ sin seed", async () => {
    const src = await readFile(path.join(process.cwd(), "scripts/migrate.mjs"), "utf8");
    expect(src).toMatch(/readdir\("migrations"\)/);
    expect(src).toMatch(/!\/seed\/i\.test/);
    expect(src).not.toMatch(/readdir\(["']seeds/);
  });

  it("PGlite local sigue teniendo usuarios DEMO activos para demos/tests", async () => {
    const users = await sql<{ email: string; active: boolean }>(
      `select email, active from app_user
       where lower(email) in ('admin@miccomed.demo', 'comprador@farmacia-norte.demo')
       order by email`,
    );
    expect(users.length).toBe(2);
    expect(users.every((u) => u.active)).toBe(true);

    const customers = await sql<{ code: string; active: boolean }>(
      `select code, active from customer where is_demo = true`,
    );
    expect(customers.length).toBeGreaterThan(0);
    expect(customers.every((c) => c.active)).toBe(true);
  });

  it("003_disable_demo_data desactiva solo DEMO (simula post-seed cleanup de prod)", async () => {
    const cleanup = await readFile(
      path.join(process.cwd(), "migrations/003_disable_demo_data.sql"),
      "utf8",
    );
    expect(cleanup).toMatch(/is_demo\s*=\s*true/);
    expect(cleanup).toMatch(/active\s*=\s*false/);
    expect(cleanup).toMatch(/%.demo/);

    // Misma semántica que 003 sobre una DB ya seeded (estado previo en prod).
    await sql(
      `update app_user set active = false where active = true
       and (lower(email) like '%.demo' or lower(email) = 'dev@example.com')`,
    );
    await sql(`update customer set active = false where is_demo = true and active = true`);
    await sql(`update sku set active = false where is_demo = true and active = true`);

    const demoUsers = await sql<{ email: string; active: boolean }>(
      `select email, active from app_user
       where lower(email) like '%.demo' or lower(email) = 'dev@example.com'`,
    );
    expect(demoUsers.length).toBeGreaterThan(0);
    expect(demoUsers.every((u) => !u.active)).toBe(true);

    const demoCustomers = await sql<{ active: boolean }>(
      `select active from customer where is_demo = true`,
    );
    expect(demoCustomers.every((c) => !c.active)).toBe(true);

    // Restaurar PGlite limpio para tests posteriores del mismo proceso.
    await resetLocalDbForTests();
  });
});
