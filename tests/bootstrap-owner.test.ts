import { beforeAll, describe, expect, it } from "vitest";
import { resetLocalDbForTests, sql } from "../src/lib/db";
import { bootstrapOwnerAdmin } from "../src/lib/auth";

describe("bootstrapOwnerAdmin", () => {
  beforeAll(async () => {
    process.env.DATABASE_URL = "";
    await resetLocalDbForTests();
  }, 60000);

  it("no hace nada si ya hay INTERNAL_ADMIN activo (seed DEMO)", async () => {
    const before = await sql<{ c: string }>(
      `select count(*)::text as c from app_user where role = 'INTERNAL_ADMIN' and active = true`,
    );
    expect(Number(before[0].c)).toBeGreaterThan(0);

    const did = await bootstrapOwnerAdmin({
      email: "owner@example.com",
      displayName: "Owner",
      existing: null,
    });
    expect(did).toBe(false);

    const created = await sql(
      `select id from app_user where lower(email) = 'owner@example.com'`,
    );
    expect(created.length).toBe(0);
  });

  it("provisiona el primer admin cuando no hay admins activos", async () => {
    await sql(`update app_user set active = false where role = 'INTERNAL_ADMIN'`);

    const did = await bootstrapOwnerAdmin({
      email: "gilbertoadonis24@gmail.com",
      displayName: "Gilberto Rivera",
      existing: null,
    });
    expect(did).toBe(true);

    const rows = await sql<{ email: string; role: string; active: boolean }>(
      `select email, role, active from app_user where lower(email) = 'gilbertoadonis24@gmail.com'`,
    );
    expect(rows[0]).toMatchObject({
      email: "gilbertoadonis24@gmail.com",
      role: "INTERNAL_ADMIN",
      active: true,
    });

    // Segundo intento no duplica ni crea otro owner distinto si ya hay admin activo
    const second = await bootstrapOwnerAdmin({
      email: "otro@example.com",
      displayName: "Otro",
      existing: null,
    });
    expect(second).toBe(false);

    await resetLocalDbForTests();
  });

  it("reactiva fila inactiva del mismo email como admin bootstrap", async () => {
    await sql(`update app_user set active = false`);
    const existing = await sql<{
      id: string;
      email: string;
      display_name: string;
      role: "INTERNAL_ADMIN" | "INTERNAL_STAFF" | "CLIENT_USER";
      customer_id: string | null;
      active: boolean;
    }>(
      `select id, email, display_name, role, customer_id, active
       from app_user where lower(email) = 'admin@miccomed.demo' limit 1`,
    );
    expect(existing[0]).toBeTruthy();

    const did = await bootstrapOwnerAdmin({
      email: "admin@miccomed.demo",
      displayName: "Admin MiccoMed DEMO",
      existing: existing[0],
    });
    expect(did).toBe(true);

    const row = await sql<{ active: boolean; role: string }>(
      `select active, role from app_user where lower(email) = 'admin@miccomed.demo'`,
    );
    expect(row[0].active).toBe(true);
    expect(row[0].role).toBe("INTERNAL_ADMIN");

    await resetLocalDbForTests();
  });
});
