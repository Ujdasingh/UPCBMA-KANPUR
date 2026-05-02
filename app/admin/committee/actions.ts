"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { getAdminContext } from "@/lib/auth";
import { assertNotLocked } from "@/lib/locks";
import { revalidatePath } from "next/cache";

/**
 * Roles whose holder gets admin rights automatically once the appointment
 * is active. Editable here (rather than in the DB) so the rule lives next
 * to the code that enforces it. Adding 'treasurer' here, for example,
 * would auto-promote treasurers too.
 */
const AUTO_ADMIN_ROLES = new Set(["president", "secretary"]);

/**
 * Promote a member to admin when their committee role qualifies.
 * Idempotent — if they're already admin or super_admin, we leave them
 * alone (super_admin is strictly higher and shouldn't be downgraded).
 *
 * Demotion is intentionally NOT automatic when the appointment ends:
 * an outgoing president might still need access during handover, and
 * removing rights silently is a footgun. Admins can revoke manually
 * via /admin/members.
 */
async function maybeAutoPromote(
  svc: ReturnType<typeof createServiceClient>,
  memberId: string,
  roleKey: string,
  status: string,
) {
  if (status !== "active") return;
  if (!AUTO_ADMIN_ROLES.has(roleKey)) return;

  const { data: member } = await svc
    .from("members")
    .select("role")
    .eq("id", memberId)
    .maybeSingle();
  if (!member) return;
  if (member.role === "admin" || member.role === "super_admin") return;

  await svc.from("members").update({ role: "admin" }).eq("id", memberId);
}

function parseForm(formData: FormData) {
  const member_id = String(formData.get("member_id") ?? "").trim();
  const role_key = String(formData.get("role_key") ?? "").trim();
  const area_name = String(formData.get("area_name") ?? "").trim() || null;
  const term_start = String(formData.get("term_start") ?? "").trim();
  const term_end = String(formData.get("term_end") ?? "").trim();
  const status = String(formData.get("status") ?? "active") as
    | "active"
    | "inactive"
    | "ended";
  const display_order = Number(formData.get("display_order") ?? 0);
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!member_id) throw new Error("Member is required");
  if (!role_key) throw new Error("Role is required");
  if (!term_start || !term_end) throw new Error("Term dates are required");
  if (term_end < term_start) throw new Error("Term end must be after start");

  return {
    member_id,
    role_key,
    area_name,
    term_start,
    term_end,
    status,
    display_order,
    notes,
  };
}

export async function createAppointment(formData: FormData) {
  const ctx = await getAdminContext();
  if (!ctx.activeChapterId) {
    throw new Error("Pick a chapter from the sidebar first.");
  }
  await assertNotLocked(ctx.me, {
    category: "committee",
    chapterId: ctx.activeChapterId,
  });
  const svc = createServiceClient();
  const payload = parseForm(formData);
  const { error } = await svc
    .from("committee_appointments")
    .insert({ ...payload, chapter_id: ctx.activeChapterId });
  if (error) throw new Error(error.message);
  await maybeAutoPromote(svc, payload.member_id, payload.role_key, payload.status);
  revalidatePath("/admin/committee");
  revalidatePath("/admin/members");
  if (ctx.activeChapter?.slug) revalidatePath(`/${ctx.activeChapter.slug}`);
}

export async function updateAppointment(id: string, formData: FormData) {
  const ctx = await getAdminContext();
  await assertNotLocked(ctx.me, {
    category: "committee",
    chapterId: ctx.activeChapterId,
    resourceId: id,
  });
  const svc = createServiceClient();
  const payload = parseForm(formData);
  const { error } = await svc
    .from("committee_appointments")
    .update(payload)
    .eq("id", id);
  if (error) throw new Error(error.message);
  await maybeAutoPromote(svc, payload.member_id, payload.role_key, payload.status);
  revalidatePath("/admin/committee");
  revalidatePath("/admin/members");
  if (ctx.activeChapter?.slug) revalidatePath(`/${ctx.activeChapter.slug}`);
}

export async function endAppointment(id: string) {
  const ctx = await getAdminContext();
  await assertNotLocked(ctx.me, {
    category: "committee",
    chapterId: ctx.activeChapterId,
    resourceId: id,
  });
  const svc = createServiceClient();
  const { error } = await svc
    .from("committee_appointments")
    .update({ status: "ended" })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/committee");
  if (ctx.activeChapter?.slug) revalidatePath(`/${ctx.activeChapter.slug}`);
}

export async function deleteAppointment(id: string) {
  const ctx = await getAdminContext();
  await assertNotLocked(ctx.me, {
    category: "committee",
    chapterId: ctx.activeChapterId,
    resourceId: id,
  });
  const svc = createServiceClient();
  const { error } = await svc
    .from("committee_appointments")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/committee");
  if (ctx.activeChapter?.slug) revalidatePath(`/${ctx.activeChapter.slug}`);
}
