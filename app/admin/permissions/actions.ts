"use server";

/**
 * Permissions admin actions — set the direct grants on a member's row.
 *
 * Authorisation: only admin or super_admin can call these. The page that
 * surfaces them already gates on role, but each action re-checks so a
 * tampered form post can't bypass it.
 */

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { getAuthedAdmin } from "@/lib/auth";

/**
 * Replace the full set of direct grants for a given member with the
 * supplied list. Anything not in `keys` is removed; anything new in
 * `keys` is inserted. Service-role bypasses RLS so the operation
 * is atomic from the app's perspective.
 *
 * Super-only keys can only be granted by another super_admin — admin
 * cannot promote a member into super tools.
 */
export async function setMemberPermissions(
  memberId: string,
  keys: string[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const me = await getAuthedAdmin();
  if (!me) return { ok: false, error: "Sign in as admin first." };

  const isSuper = me.role === "super_admin";
  const filteredKeys = keys.filter((k) =>
    isSuper ? true : !k.startsWith("super."),
  );

  const svc = createServiceClient();

  // Validate that every key actually exists in the catalogue. Defends
  // against typos + a tampered form passing arbitrary strings.
  const { data: catalogue } = await svc
    .from("permissions")
    .select("key");
  const validKeys = new Set((catalogue ?? []).map((r) => r.key as string));
  const safeKeys = filteredKeys.filter((k) => validKeys.has(k));

  // Strategy: delete everything for this member, then insert the new set.
  // Permissions tables are tiny so this is fine, and it keeps the diff
  // logic dead simple.
  const { error: delErr } = await svc
    .from("member_permissions")
    .delete()
    .eq("member_id", memberId);
  if (delErr) return { ok: false, error: delErr.message };

  if (safeKeys.length > 0) {
    const rows = safeKeys.map((k) => ({
      member_id: memberId,
      permission_key: k,
      granted_by: me.id,
    }));
    const { error: insErr } = await svc
      .from("member_permissions")
      .insert(rows);
    if (insErr) return { ok: false, error: insErr.message };
  }

  revalidatePath("/admin/permissions");
  return { ok: true };
}
