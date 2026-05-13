/**
 * Shared audit-log helper. Every mutation that touches sensitive state
 * (committee swaps, member invites/role changes, chapter locks, scope
 * grants, agenda approvals) should call writeAudit() so the action shows
 * up in the chapter or state audit timeline.
 *
 * Why a shared helper?
 *   Different action files were each rolling their own audit() that
 *   inserted to admin_audit_log without chapter_id. That made the table
 *   unscopeable — every chapter admin would have seen every other
 *   chapter's actions. This helper takes a chapterId argument and writes
 *   it consistently so the chapter audit page can filter cleanly.
 *
 * Audit failures must NEVER block the underlying mutation. We swallow
 * any error from the insert.
 */

import { createServiceClient } from "@/lib/supabase/server";
import { resolveAuthIdentity } from "@/lib/auth";

export type AuditOpts = {
  action: string;
  target_table: string;
  target_id?: string | null;
  /** Chapter the action affected. NULL = state-scoped (Tier 2 only). */
  chapter_id?: string | null;
  diff?: Record<string, unknown> | null;
};

export async function writeAudit(opts: AuditOpts): Promise<void> {
  try {
    const { real, effective, isImpersonating } = await resolveAuthIdentity();
    const svc = createServiceClient();
    await svc.from("admin_audit_log").insert({
      actor_id: real.id,
      acting_as_id: isImpersonating ? effective.id : null,
      action: opts.action,
      target_table: opts.target_table,
      target_id: opts.target_id ?? null,
      chapter_id: opts.chapter_id ?? null,
      diff: opts.diff ?? null,
    });
  } catch {
    // Audit failures must not block the mutation.
  }
}
