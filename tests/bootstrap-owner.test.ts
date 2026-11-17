import { beforeAll, afterEach, describe, expect, it } from "vitest";
import { resetLocalDbForTests, sql } from "../src/lib/db";
import { bootstrapOwnerAdmin } from "../src/lib/auth";
import { isBootstrapAdminEmail } from "../src/lib/bootstrap-allowlist";

describe("bootstrapOwnerAdmin (allowlist)", () => {
  beforeAll(async () => {
    process.env.DATABASE_URL = "";
    await resetLocalDbForTests();
  }, 60000);

  afterEach(async () => {
    delete process.env.BOOTSTRAP_ADMIN_EMAIL;
    await resetLocalDbForTests();
  });

  it("reconoce allowlist de cursor-app.json sin secret", () => {
    delete process.env.BOOTSTRAP_ADMIN_EMAIL;
    expect(isBootstrapAdminEmail("gilbertoadonis24@gmail.com")).toBe(true);
    expect(isBootstrapAdminEmail("intruso@example.com")).toBe(false);
  });

  it("no promueve a un visor arbitrario aunque no haya admins", async () => {
    await sql(`update app_user set active = false where role = 'INTERNAL_ADMIN'`);
    delete process.env.BOOTSTRAP_ADMIN_EMAIL;

    expect(isBootstrapAdminEmail("intruso@example.com")).toBe(false);
    const did = await bootstrapOwnerAdmin({
      email: "intruso@example.com",
      displayName: "Intruso",
      existing: null,
    });
    expect(did).toBe(false);
    const rows = await sql(`select id from app_user where lower(email) = 'intruso@example.com'`);
    expect(rows.length).toBe(0);
  });

  it("no hace nada si ya hay INTERNAL_ADMIN activo", async () => {
    process.env.BOOTSTRAP_ADMIN_EMAIL = "owner@example.com";
    const did = await bootstrapOwnerAdmin({
      email: "owner@example.com",
      displayName: "Owner",
      existing: null,
    });
    expect(did).toBe(false);
  });

  it("provisiona solo si el email está en BOOTSTRAP_ADMIN_EMAIL", async () => {
    await sql(`update app_user set active = false where role = 'INTERNAL_ADMIN'`);
    process.env.BOOTSTRAP_ADMIN_EMAIL = "gilbertoadonis24@gmail.com, other@example.com";

    expect(isBootstrapAdminEmail("gilbertoadonis24@gmail.com")).toBe(true);
    const denied = await bootstrapOwnerAdmin({
      email: "random@cursor.dev",
      displayName: "Random",
      existing: null,
    });
    expect(denied).toBe(false);

    const did = await bootstrapOwnerAdmin({
      email: "gilbertoadonis24@gmail.com",
      displayName: "Gilberto Rivera",
      existing: null,
    });
    expect(did).toBe(true);

    const rows = await sql<{ role: string; active: boolean }>(
      `select role, active from app_user where lower(email) = 'gilbertoadonis24@gmail.com'`,
    );
    expect(rows[0]).toMatchObject({ role: "INTERNAL_ADMIN", active: true });
  });
});
