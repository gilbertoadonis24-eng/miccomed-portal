import { beforeAll, describe, expect, it, vi } from "vitest";
import type { SessionUser } from "../src/lib/auth";

const adminSession = (): SessionUser => ({
  id: "44444444-4444-4444-4444-444444444001",
  email: "admin@miccomed.demo",
  displayName: "Admin",
  role: "INTERNAL_ADMIN",
  customerId: null,
  permissions: [
    "view_cost",
    "override_margin",
    "send_quote",
    "confirm_order",
    "ship",
    "issue_invoice",
    "post_payment",
  ],
  plane: "internal",
  simulated: true,
});

const staffWithViewCost = (): SessionUser => ({
  id: "44444444-4444-4444-4444-444444444002",
  email: "staff@miccomed.demo",
  displayName: "Staff",
  role: "INTERNAL_STAFF",
  customerId: null,
  permissions: ["view_cost", "send_quote", "ship"],
  plane: "internal",
  simulated: true,
});

const clientSession = (): SessionUser => ({
  id: "44444444-4444-4444-4444-444444444003",
  email: "comprador@farmacia-norte.demo",
  displayName: "Buyer",
  role: "CLIENT_USER",
  customerId: "22222222-2222-2222-2222-222222222001",
  permissions: [],
  plane: "client",
  simulated: true,
});

vi.mock("../src/lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/lib/auth")>();
  return {
    ...actual,
    resolveSession: vi.fn(),
  };
});

describe("admin authz — maestros mutables", () => {
  let requireAdmin: typeof import("../src/lib/auth").requireAdmin;
  let requirePermission: typeof import("../src/lib/auth").requirePermission;
  let resolveSession: ReturnType<typeof vi.fn>;
  let postLots: typeof import("../src/app/api/admin/lots/route").POST;
  let postPricing: typeof import("../src/app/api/admin/pricing/route").POST;

  beforeAll(async () => {
    const auth = await import("../src/lib/auth");
    requireAdmin = auth.requireAdmin;
    requirePermission = auth.requirePermission;
    resolveSession = auth.resolveSession as unknown as ReturnType<typeof vi.fn>;
    ({ POST: postLots } = await import("../src/app/api/admin/lots/route"));
    ({ POST: postPricing } = await import("../src/app/api/admin/pricing/route"));
  });

  it("requireAdmin: admin ok; staff view_cost 403; cliente 404", () => {
    expect(requireAdmin(adminSession())).toBeNull();
    expect(requirePermission(staffWithViewCost(), "view_cost")).toBeNull();

    const staffDenied = requireAdmin(staffWithViewCost());
    expect(staffDenied).toBeInstanceOf(Response);
    expect(staffDenied!.status).toBe(403);

    const clientDenied = requireAdmin(clientSession());
    expect(clientDenied).toBeInstanceOf(Response);
    expect(clientDenied!.status).toBe(404);
  });

  it("POST /api/admin/lots: staff con sesión interna recibe 403", async () => {
    resolveSession.mockResolvedValue(staffWithViewCost());
    const res = await postLots(
      new Request("http://local/api/admin/lots", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          skuId: "55555555-5555-5555-5555-555555555001",
          lotCode: "STAFF-FAIL",
          qty: 1,
        }),
      }),
    );
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ reason: "admin_required" });
  });

  it("POST /api/admin/pricing upsert_ulc: view_cost no basta (403)", async () => {
    resolveSession.mockResolvedValue(staffWithViewCost());
    const res = await postPricing(
      new Request("http://local/api/admin/pricing", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "upsert_ulc",
          skuId: "55555555-5555-5555-5555-555555555001",
          ulc: 9.99,
        }),
      }),
    );
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ reason: "admin_required" });
  });
});
