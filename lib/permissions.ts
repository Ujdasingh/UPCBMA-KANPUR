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

/** Permissions an *officer-tier* admin_scopes row grants for the chapter. */
export const OFFICER_GRANTS = new Set<string>([
  "news.edit",
  "agendas.edit",
  "agendas.approve",
  "events.edit",
  "messages.manage",
  "committee.edit",
  "committee_roles.edit",
  "lab.edit",
  "bookings.manage",
  "members.edit",
  "members.invite",
  "members.set_admin",
  "office.edit",
]);

/** Permissions a *content-tier* admin_scopes row grants for the chapter. */
export const CONTENT_GRANTS = new Set<string>([
  "news.edit",
  "agendas.edit",
  "events.edit",
  "committee.edit",
  "messages.manage",
]);

/**
 * Legacy alias — kept so existing callers compile. New code should reach
 * for OFFICER_GRANTS or CONTENT_GRANTS directly via admin_scopes.tier.
 */
export const COMMITTEE_AUTO_GRANTS = CONTENT_GRANTS;

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
 * A scoped permission grant — what the member can do, where.
 *
 * `chapterId === null` means the grant applies state-wide (Tier 1 /
 * Admin UPCBMA). Otherwise it's the chapter UUID the keys apply to.
 */
export type ScopedGrant = {
  chapterId: string | null;
  keys: Set<string>;
};

/**
 * Resolve the effective scoped permissions for a member id. Returns
 * one ScopedGrant per scope (state, plus one per chapter where they
 * have rights).
 *
 * Order of precedence (additive across all sources):
 *   1. Role baseline:
 *        super_admin → every key, state-wide
 *        admin       → every key except super.*, state-wide (legacy
 *                      cross-chapter admin role; we're moving away from
 *                      this but keep it working for any leftover rows)
 *   2. admin_scopes rows — tier='officer' grants OFFICER_GRANTS for
 *      the row's chapter (or state-wide if chapter_id IS NULL); tier=
 *      'content' grants CONTENT_GRANTS for that chapter only.
 *   3. member_permissions direct grants — applied state-wide so a
 *      surgical "Lab desk" permission works regardless of chapter.
 */
export async function getScopedPermissions(
  memberId: string,
): Promise<ScopedGrant[]> {
  const svc = createServiceClient();

  const [memberRow, allPerms, directGrants, scopeRows] = await Promise.all([
    svc.from("members").select("role").eq("id", memberId).maybeSingle(),
    svc.from("permissions").select("key"),
    svc
      .from("member_permissions")
      .select("permission_key")
      .eq("member_id", memberId),
    svc
      .from("admin_scopes")
      .select("chapter_id, tier")
      .eq("member_id", memberId),
  ]);

  if (!memberRow.data) return [];
  const role = memberRow.data.role;
  const allKeys = (allPerms.data ?? []).map((r) => r.key as string);

  // Map<chapterId | "STATE", Set<key>>.
  const byScope = new Map<string, Set<string>>();
  const stateKey = "STATE";
  const ensure = (k: string) => {
    if (!byScope.has(k)) byScope.set(k, new Set());
    return byScope.get(k)!;
  };

  if (role === "super_admin") {
    const s = ensure(stateKey);
    allKeys.forEach((k) => s.add(k));
    return [{ chapterId: null, keys: s }];
  }
  if (role === "admin") {
    const s = ensure(stateKey);
    allKeys.forEach((k) => {
      if (!k.startsWith("super.")) s.add(k);
    });
  }

  // admin_scopes rows.
  for (const row of scopeRows.data ?? []) {
    const cid: string | null = row.chapter_id ?? null;
    const tier: string =
      (row as { tier?: string | null }).tier ?? "officer";
    const grants = tier === "content" ? CONTENT_GRANTS : OFFICER_GRANTS;
    const s = ensure(cid ?? stateKey);
    if (cid === null) {
      // Tier 1 — state-wide. Officer grants applied at state level
      // mean every chapter, and we let the action layer enforce
      // chapter targeting.
      grants.forEach((k) => s.add(k));
    } else {
      grants.forEach((k) => s.add(k));
    }
  }

  // Direct grants — state-wide for now. Could be scoped later if we
  // need (member_permissions would gain a chapter_id column).
  if ((directGrants.data ?? []).length > 0) {
    const s = ensure(stateKey);
    for (const r of directGrants.data!) {
      s.add((r as { permission_key: string }).permission_key);
    }
  }

  return Array.from(byScope.entries()).map(([k, v]) => ({
    chapterId: k === stateKey ? null : k,
    keys: v,
  }));
}

/**
 * Backwards-compatible: returns the union of ALL scopes' keys. Use this
 * only when the caller doesn't care about the chapter (e.g., to decide
 * whether to render a sidebar item at all). For mutations, always check
 * with hasScopedPermission(memberId, key, chapterId).
 */
export async function getEffectivePermissions(
  memberId: string,
): Promise<Set<string>> {
  const grants = await getScopedPermissions(memberId);
  const out = new Set<string>();
  for (const g of grants) g.keys.forEach((k) => out.add(k));
  return out;
}

/**
 * Tighter check — does the caller have `key` for `chapterId`?
 *  - State-wide grants (chapterId=null in the grant) satisfy any chapter.
 *  - A grant scoped to chapter X only satisfies actions targeting chapter X.
 */
export async function hasScopedPermission(
  memberId: string,
  key: string,
  chapterId: string | null,
): Promise<boolean> {
  const grants = await getScopedPermissions(memberId);
  for (const g of grants) {
    if (!g.keys.has(key)) continue;
    if (g.chapterId === null) return true; // state-wide
    if (chapterId !== null && g.chapterId === chapterId) return true;
  }
  return false;
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
