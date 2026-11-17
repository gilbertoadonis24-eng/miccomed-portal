import { getIdentity } from "../../cursor/identity";
import { sql } from "./db";

export type AppRole = "INTERNAL_ADMIN" | "INTERNAL_STAFF" | "CLIENT_USER";

export type StaffPermission =
  | "view_cost"
  | "override_margin"
  | "send_quote"
  | "confirm_order"
  | "ship"
  | "issue_invoice"
  | "post_payment";

export type SessionUser = {
  id: string;
  email: string;
  displayName: string;
  role: AppRole;
  customerId: string | null;
  permissions: StaffPermission[];
  plane: "internal" | "client";
  simulated: boolean;
};

type AppUserRow = {
  id: string;
  email: string;
  display_name: string;
  role: AppRole;
  customer_id: string | null;
  active: boolean;
};

export async function resolveSession(request: Request): Promise<SessionUser | Response> {
  const identity = await getIdentity(request);
  if (!identity.verified) {
    return Response.json(
      { error: "unauthorized", reason: identity.reason },
      { status: 401, headers: { "cache-control": "private, no-store" } },
    );
  }
  if (identity.kind === "key") {
    return Response.json(
      { error: "forbidden", reason: "api_key_not_mapped" },
      { status: 403, headers: { "cache-control": "private, no-store" } },
    );
  }

  const email = identity.email.trim().toLowerCase();
  if (!email) {
    return Response.json(
      { error: "unauthorized", reason: "email_required" },
      { status: 401, headers: { "cache-control": "private, no-store" } },
    );
  }

  const users = await sql<AppUserRow>(
    `select id, email, display_name, role, customer_id, active
     from app_user where lower(email) = $1 limit 1`,
    [email],
  );
  const user = users[0];
  if (!user || !user.active) {
    return Response.json(
      {
        error: "forbidden",
        reason: "user_not_provisioned",
        hint: "El visor Cursor debe estar invitado en app_user (email).",
        email,
      },
      { status: 403, headers: { "cache-control": "private, no-store" } },
    );
  }

  if (user.role === "CLIENT_USER" && !user.customer_id) {
    return Response.json(
      { error: "forbidden", reason: "client_without_customer" },
      { status: 403, headers: { "cache-control": "private, no-store" } },
    );
  }

  let permissions: StaffPermission[] = [];
  if (user.role === "INTERNAL_ADMIN") {
    permissions = [
      "view_cost",
      "override_margin",
      "send_quote",
      "confirm_order",
      "ship",
      "issue_invoice",
      "post_payment",
    ];
  } else if (user.role === "INTERNAL_STAFF") {
    const rows = await sql<{ permission: StaffPermission }>(
      `select permission from staff_permission where user_id = $1`,
      [user.id],
    );
    permissions = rows.map((r) => r.permission);
  }

  return {
    id: user.id,
    email: user.email,
    displayName: user.display_name,
    role: user.role,
    customerId: user.customer_id,
    permissions,
    plane: user.role === "CLIENT_USER" ? "client" : "internal",
    simulated: Boolean(identity.simulated),
  };
}

export function requireInternal(session: SessionUser): Response | null {
  if (session.plane !== "internal") {
    return Response.json(
      { error: "not_found" },
      { status: 404, headers: { "cache-control": "private, no-store" } },
    );
  }
  return null;
}

export function requirePermission(
  session: SessionUser,
  permission: StaffPermission,
): Response | null {
  const denied = requireInternal(session);
  if (denied) return denied;
  if (session.role === "INTERNAL_ADMIN") return null;
  if (!session.permissions.includes(permission)) {
    return Response.json(
      { error: "forbidden", reason: "missing_permission", permission },
      { status: 403, headers: { "cache-control": "private, no-store" } },
    );
  }
  return null;
}

/** Maestros mutables (ULC write, lot create, etc.): solo INTERNAL_ADMIN. */
export function requireAdmin(session: SessionUser): Response | null {
  const denied = requireInternal(session);
  if (denied) return denied;
  if (session.role !== "INTERNAL_ADMIN") {
    return Response.json(
      { error: "forbidden", reason: "admin_required" },
      { status: 403, headers: { "cache-control": "private, no-store" } },
    );
  }
  return null;
}

export function requireClient(session: SessionUser): Response | null {
  if (session.plane !== "client" || !session.customerId) {
    return Response.json(
      { error: "not_found" },
      { status: 404, headers: { "cache-control": "private, no-store" } },
    );
  }
  return null;
}

export function clientOwnsOr404(
  session: SessionUser,
  customerId: string | null | undefined,
): Response | null {
  if (session.plane === "internal") return null;
  if (!session.customerId || !customerId || session.customerId !== customerId) {
    return Response.json(
      { error: "not_found" },
      { status: 404, headers: { "cache-control": "private, no-store" } },
    );
  }
  return null;
}

export async function audit(
  actorUserId: string | null,
  action: string,
  objectType: string,
  objectId?: string | null,
  reason?: string | null,
): Promise<void> {
  await sql(
    `insert into audit_event (actor_user_id, action, object_type, object_id, reason)
     values ($1, $2, $3, $4, $5)`,
    [actorUserId, action, objectType, objectId ?? null, reason ?? null],
  );
}
