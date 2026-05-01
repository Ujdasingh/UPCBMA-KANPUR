/**
 * Recipient-resolution helpers for transactional email.
 *
 * Most server actions need to answer "who should be CC'd on this?". The rules
 * vary slightly per surface but boil down to these primitives:
 *
 *   • chapterCommittee(chapterId)  → active committee for one chapter
 *   • chapterAdmins(chapterId)     → admins scoped to the chapter (or state)
 *   • stateAdmins()                → state-wide admins + super_admins
 *   • secretariat()                → the explicit secretariat email setting,
 *                                    falling back to state admins
 *
 * Every helper returns a deduped lower-case email list (or [] when nothing
 * to send). super_admin rows are ALWAYS excluded — they're meant to be
 * invisible to outward-facing flows.
 */

import { createServiceClient } from "@/lib/supabase/server";
import { getSetting } from "@/lib/site-settings";

const dedupe = (arr: (string | null | undefined)[]) =>
  Array.from(
    new Set(
      arr
        .filter((s): s is string => !!s && s.length > 3)
        .map((s) => s.toLowerCase().trim()),
    ),
  );

export async function chapterCommittee(chapterId: string): Promise<string[]> {
  const svc = createServiceClient();
  const { data } = await svc
    .from("committee_appointments")
    .select("member:members(email, role)")
    .eq("chapter_id", chapterId)
    .eq("status", "active");
  return dedupe(
    (data ?? []).map((r) => {
      const m = Array.isArray(r.member) ? r.member[0] : r.member;
      return m?.role === "super_admin" ? null : m?.email;
    }),
  );
}

/**
 * Admins who can act inside a chapter. Includes:
 *   - members with admin_scopes.chapter_id = chapterId (chapter-scoped admins)
 *   - members with admin_scopes.chapter_id IS NULL  (state-wide admins)
 *
 * super_admin rows are excluded.
 */
export async function chapterAdmins(chapterId: string): Promise<string[]> {
  const svc = createServiceClient();
  const { data: scopes } = await svc
    .from("admin_scopes")
    .select("member:members(email, role)")
    .or(`chapter_id.eq.${chapterId},chapter_id.is.null`);
  return dedupe(
    (scopes ?? []).map((r) => {
      const m = Array.isArray(r.member) ? r.member[0] : r.member;
      return m?.role === "super_admin" ? null : m?.email;
    }),
  );
}

export async function stateAdmins(): Promise<string[]> {
  const svc = createServiceClient();
  const { data: scopes } = await svc
    .from("admin_scopes")
    .select("member:members(email, role)")
    .is("chapter_id", null);
  return dedupe(
    (scopes ?? []).map((r) => {
      const m = Array.isArray(r.member) ? r.member[0] : r.member;
      return m?.role === "super_admin" ? null : m?.email;
    }),
  );
}

/**
 * Resolve the secretariat email — explicit setting first, falling back to
 * state admins. Returns [] when neither is configured (caller can decide
 * whether to skip silently or queue the message in the DB only).
 */
export async function secretariat(): Promise<string[]> {
  const explicit = await getSetting("state_contact_email");
  if (explicit) return [explicit.toLowerCase().trim()];
  return stateAdmins();
}
