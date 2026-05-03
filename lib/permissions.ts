/**
 * Permissions model.
 *
 * Effective permissions for a member are the union of:
 *
 *   1. Role baseline:
 *      - super_admin → every permission, including super.*
 *      - admin       → every permission EXCEPT super.*
 *      - member      → no permissions from role alone
 *
 *   2. Committee auto-grants:
 *      - Any active committee_appointment (today between term_start and
 *        term_end) implicitly grants the content tier:
 *        news.edit, agendas.edit, events.edit, committee.edit,
 *        messages.manage.
 *      - Officer roles (president/secretary/treasurer/vice_president —
 *        already auto-promoted to role='admin' via committee/actions.ts —
 *        get the rest by virtue of being admin.
 *
 *   3. Direct grants from member_permissions table — used by
 *      /admin/permissions to give a non-officer surgical access (e.g.
 *      "labkanpur" gets lab.edit + bookings.manage without becoming a
 *      full admin).
 */

import { createServiceClient } from "@/lib/supabase/server";
import { getAuthedMember } from "@/lib/auth";

export type PermissionArea =
  | "content"
  | "committee"
  | "lab"
  | "members_office"
  | "super";

export type Permission = {
  key: string;
  label: string;
  area: PermissionArea;
  description: string | null;
  display_order: number;
};

/** Permissions every active committee member gets for free. */
export const COMMITTEE_AUTO_GRANTS = new Set<string>([
  "news.edit",
  "agendas.edit",
  "events.edit",
  "committee.edit",
  "messages.manage",
]);

/**
 * All permissions known to the app. Cached per request — the catalogue
 * rarely changes.
 */
export async function listPermissions(): Promise<Permission[]> {
  const svc = createServiceClient();
  const { data } = await svc
    .from("permissions")
    .select("*")
    .order("area, display_order, key");
  return (data ?? []) as Permission[];
}

/**
 * Resolve the effective set of permission keys for a member id. Returns
 * null when the member doesn't exist (treat as zero permissions).
 */
export async function getEffectivePermissions(
  memberId: string,
): Promise<Set<string>> {
  const svc = createServiceClient();
  const today = new Date().toISOString().slice(0, 10);

  const [memberRow, allPerms, directGrants, activeAppointments] =
    await Promise.all([
      svc.from("members").select("role").eq("id", memberId).maybeSingle(),
      svc.from("permissions").select("key"),
      svc
        .from("member_permissions")
        .select("permission_key")
        .eq("member_id", memberId),
      svc
        .from("committee_appointments")
        .select("id")
        .eq("member_id", memberId)
        .eq("status", "active")
        .lte("term_start", today)
        .gte("term_end", today)
        .limit(1),
    ]);

  const out = new Set<string>();
  if (!memberRow.data) return out;
  const role = memberRow.data.role;
  const allKeys = (allPerms.data ?? []).map((r) => r.key as string);

  if (role === "super_admin") {
    allKeys.forEach((k) => out.add(k));
    return out;
  }
  if (role === "admin") {
    allKeys.forEach((k) => {
      if (!k.startsWith("super.")) out.add(k);
    });
  }

  // Direct grants always count.
  for (const r of directGrants.data ?? []) {
    out.add((r as { permission_key: string }).permission_key);
  }

  // Committee auto-grants (only when an active appointment exists).
  if ((activeAppointments.data ?? []).length > 0) {
    COMMITTEE_AUTO_GRANTS.forEach((k) => out.add(k));
  }

  return out;
}

/**
 * Quick check for a single permission. Convenient sugar over
 * getEffectivePermissions().
 */
export async function hasPermission(
  memberId: string,
  key: string,
): Promise<boolean> {
  const set = await getEffectivePermissions(memberId);
  return set.has(key);
}

/**
 * Combo: get the signed-in member, return their permission set, or null
 * when they're not signed in. Server-component friendly.
 */
export async function getMyPermissions(): Promise<{
  memberId: string;
  perms: Set<string>;
} | null> {
  const me = await getAuthedMember();
  if (!me) return null;
  return { memberId: me.id, perms: await getEffectivePermissions(me.id) };
}
