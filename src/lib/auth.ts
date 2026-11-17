import { getIdentity } from "../../cursor/identity";
import { isBootstrapAdminEmail } from "./bootstrap-allowlist";
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

  let users = await sql<AppUserRow>(
    `select id, email, display_name, role, customer_id, active
     from app_user where lower(email) = $1 limit 1`,
    [email],
  );
  let user = users[0];

  // Sin admins activos: solo emails en secret BOOTSTRAP_ADMIN_EMAIL.
  if (!user || !user.active) {
    const bootstrapped = await bootstrapOwnerAdmin({
      email,
      displayName: identity.name?.trim() || email,
      existing: user ?? null,
    });
    if (bootstrapped) {
      users = await sql<AppUserRow>(
        `select id, email, display_name, role, customer_id, active
         from app_user where lower(email) = $1 limit 1`,
        [email],
      );
      user = users[0];
    }
  }

  if (!user || !user.active) {
    return Response.json(
      {
        error: "forbidden",
        reason: "user_not_provisioned",
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
    permissions = staffPermissionsForAdmin();
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

const ALL_STAFF_PERMS: StaffPermission[] = [
  "view_cost",
  "override_margin",
  "send_quote",
  "confirm_order",
  "ship",
  "issue_invoice",
  "post_payment",
];

async function hasNoActiveAdmin(): Promise<boolean> {
  const activeAdmins = await sql<{ id: string }>(
    `select id from app_user
     where role = 'INTERNAL_ADMIN' and active = true
     limit 1`,
  );
  return !activeAdmins[0];
}

/**
 * Solo si no hay INTERNAL_ADMIN activo Y el email está en
 * `BOOTSTRAP_ADMIN_EMAIL` (secret/env; nunca allowlist en archivos shippeados).
 */
export async function bootstrapOwnerAdmin(input: {
  email: string;
  displayName: string;
  existing: AppUserRow | null;
}): Promise<boolean> {
  if (!(await hasNoActiveAdmin())) return false;

  const email = input.email.trim().toLowerCase();
  if (!isBootstrapAdminEmail(email)) return false;

  if (input.existing) {
    await sql(
      `update app_user
       set active = true,
           role = 'INTERNAL_ADMIN',
           customer_id = null,
           display_name = $2
       where id = $1`,
      [input.existing.id, input.displayName],
    );
    await audit(input.existing.id, "bootstrap_owner_admin", "app_user", input.existing.id);
    return true;
  }

  const inserted = await sql<{ id: string }>(
    `insert into app_user (email, display_name, role, customer_id, active)
     values ($1, $2, 'INTERNAL_ADMIN', null, true)
     returning id`,
    [email, input.displayName],
  );
  const id = inserted[0]?.id;
  if (!id) return false;
  await audit(id, "bootstrap_owner_admin", "app_user", id);
  return true;
}

export function staffPermissionsForAdmin(): StaffPermission[] {
  return [...ALL_STAFF_PERMS];
}
