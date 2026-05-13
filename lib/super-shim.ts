/**
 * Super-admin invisibility shim.
 *
 * The super_admin account exists outside the four-tier model — it's the
 * platform owner / state secretariat backstop, not a person Tier 2/3/4
 * users should ever see, mention, or be able to modify. Without this
 * shim, super_admins would show up in member rosters, audit timelines,
 * permissions matrices, and committee pickers, which both leaks identity
 * and lets a clever Tier 2 user try to demote them.
 *
 * Two functions here:
 *
 *   filterSuperAdmin(rows, isSuper)
 *     Drop rows where role==='super_admin' unless the viewer is super.
 *     Use everywhere admin tables/lists are built from members rows.
 *
 *   assertNotTargetingSuperAdmin(targetId, isSuper)
 *     Mutation guard. Throws if a non-super action would modify a
 *     super_admin row. Use in every server action that takes a memberId
 *     and could edit/delete it.
 */

import { createServiceClient } from "@/lib/supabase/server";

export function filterSuperAdmin<T extends { role?: string | null }>(
  rows: T[],
  isSuper: boolean,
): T[] {
  if (isSuper) return rows;
  return rows.filter((r) => r.role !== "super_admin");
}

/**
 * Throws an error when a non-super caller tries to act on a super_admin
 * target. Cheap — one indexed lookup. Call it BEFORE the actual mutation
 * so a failed assertion leaves no residue.
 */
export async function assertNotTargetingSuperAdmin(
  targetMemberId: string | null | undefined,
  isSuper: boolean,
): Promise<void> {
  if (isSuper) return;
  if (!targetMemberId) return;
  const svc = createServiceClient();
  const { data: target } = await svc
    .from("members")
    .select("role")
    .eq("id", targetMemberId)
    .maybeSingle();
  if (target?.role === "super_admin") {
    // Deliberately vague — don't reveal that the row is a super_admin.
    throw new Error("Forbidden: this account cannot be modified.");
  }
}
