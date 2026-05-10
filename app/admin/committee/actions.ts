"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { getAdminContext, getAuthedAdmin } from "@/lib/auth";
import { hasScopedPermission } from "@/lib/permissions";
import { assertNotLocked } from "@/lib/locks";
import { revalidatePath } from "next/cache";

/**
 * Officer-tier role keys — match the seat-power model. Anyone in one of
 * these seats gets full chapter-admin rights for the chapter.
 *
 * Other committee role keys (vice-president variants, joint treasurer,
 * EC member, area heads) get the *content* tier — they can edit news,
 * agendas, events, committee — but not members, office, lab, etc.
 */
const OFFICER_ROLE_KEYS = new Set([
  "president",
  "vp1",
  "vp2",
  "vice_president",
  "general_secretary",
  "gs",
  "joint_secretary",
  "js",
  "treasurer",
  "joint_treasurer",
  "jt",
]);

/** Statuses that grant rights. Anything else (inactive/ended) revokes. */
const ACTIVE_STATUSES = new Set(["active", "acting"]);

/**
 * Sync admin_scopes to match a committee_appointments change. Idempotent:
 * inserts on first call, updates the tier on later calls, removes the
 * scope when the appointment leaves an active status — but ONLY if the
 * member has no other active+acting appointment in the same chapter
 * (so swapping one seat for another in the same chapter keeps rights
 * stable).
 */
async function syncScopeForAppointment(
  svc: ReturnType<typeof createServiceClient>,
  memberId: string,
  chapterId: string,
  roleKey: string,
  status: string,
) {
  const expectedTier = OFFICER_ROLE_KEYS.has(roleKey) ? "officer" : "content";

  if (ACTIVE_STATUSES.has(status)) {
    // Pick the highest-tier across this member's other active/acting
    // appointments in the same chapter, then upsert.
    const { data: others } = await svc
      .from("committee_appointments")
      .select("role_key, status")
      .eq("member_id", memberId)
      .eq("chapter_id", chapterId)
      .in("status", Array.from(ACTIVE_STATUSES));
    const tier =
      (others ?? []).some((o) => OFFICER_ROLE_KEYS.has(o.role_key)) ||
      expectedTier === "officer"
        ? "officer"
        : "content";
    await svc
      .from("admin_scopes")
      .upsert(
        { member_id: memberId, chapter_id: chapterId, tier },
        { onConflict: "member_id,chapter_id" },
      );
    return;
  }

  // Status is leaving active+acting. Drop the scope only when no other
  // active+acting appointment remains for this (member, chapter).
  const { data: stillActive } = await svc
    .from("committee_appointments")
    .select("role_key")
    .eq("member_id", memberId)
    .eq("chapter_id", chapterId)
    .in("status", Array.from(ACTIVE_STATUSES));
  if ((stillActive ?? []).length === 0) {
    await svc
      .from("admin_scopes")
      .delete()
      .eq("member_id", memberId)
      .eq("chapter_id", chapterId);
    return;
  }
  // At least one active row left — recompute tier from what's left.
  const tier = (stillActive ?? []).some((o) =>
    OFFICER_ROLE_KEYS.has(o.role_key),
  )
    ? "officer"
    : "content";
  await svc
    .from("admin_scopes")
    .upsert(
      { member_id: memberId, chapter_id: chapterId, tier },
      { onConflict: "member_id,chapter_id" },
    );
}

/**
 * Authority guard for who can assign a President seat. Per the design,
 * the President of a chapter must be appointed by Tier 1 (Admin UPCBMA
 * or Super Admin) — chapters can't perpetuate themselves at the top.
 */
async function assertCanAssignRole(
  callerId: string,
  chapterId: string,
  roleKey: string,
) {
  if (roleKey !== "president") return; // any chapter admin can assign
  // Tier 1 = state-wide admin_scopes (chapter_id IS NULL) or super_admin
  // role. hasScopedPermission with chapterId=null only returns true when
  // the caller has a state-wide grant — exactly the rule we want.
  const stateLevel = await hasScopedPermission(
    callerId,
    "committee.edit",
    null,
  );
  if (!stateLevel) {
    throw new Error(
      "Only Admin UPCBMA can assign the President seat. Ask the state secretariat to make this appointment.",
    );
  }
  void chapterId;
}

function parseForm(formData: FormData) {
  const member_id = String(formData.get("member_id") ?? "").trim();
  const role_key = String(formData.get("role_key") ?? "").trim();
  const area_name = String(formData.get("area_name") ?? "").trim() || null;
  const term_start = String(formData.get("term_start") ?? "").trim();
  const term_end = String(formData.get("term_end") ?? "").trim();
  const status = String(formData.get("status") ?? "active") as
    | "active"
    | "acting"
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
  const me = await getAuthedAdmin();
  if (!me) throw new Error("Sign in first.");
  await assertNotLocked(ctx.me, {
    category: "committee",
    chapterId: ctx.activeChapterId,
  });
  const svc = createServiceClient();
  const payload = parseForm(formData);
  await assertCanAssignRole(me.id, ctx.activeChapterId, payload.role_key);

  const { error } = await svc
    .from("committee_appointments")
    .insert({ ...payload, chapter_id: ctx.activeChapterId });
  if (error) throw new Error(error.message);

  await syncScopeForAppointment(
    svc,
    payload.member_id,
    ctx.activeChapterId,
    payload.role_key,
    payload.status,
  );
  revalidatePath("/admin/committee");
  revalidatePath("/admin/members");
  if (ctx.activeChapter?.slug) revalidatePath(`/${ctx.activeChapter.slug}`);
}

export async function updateAppointment(id: string, formData: FormData) {
  const ctx = await getAdminContext();
  const me = await getAuthedAdmin();
  if (!me) throw new Error("Sign in first.");
  await assertNotLocked(ctx.me, {
    category: "committee",
    chapterId: ctx.activeChapterId,
    resourceId: id,
  });
  const svc = createServiceClient();
  const payload = parseForm(formData);

  // Look up the existing row so we know which (member, chapter) to sync —
  // the form may be changing member_id, role_key, status, or all three.
  const { data: existing } = await svc
    .from("committee_appointments")
    .select("member_id, chapter_id, role_key")
    .eq("id", id)
    .maybeSingle();
  if (!existing) throw new Error("Appointment not found.");

  await assertCanAssignRole(me.id, existing.chapter_id, payload.role_key);

  const { error } = await svc
    .from("committee_appointments")
    .update(payload)
    .eq("id", id);
  if (error) throw new Error(error.message);

  // Sync the post-update state. Also sync the OLD member if the seat
  // moved to someone else — they may have lost their rights.
  await syncScopeForAppointment(
    svc,
    payload.member_id,
    existing.chapter_id,
    payload.role_key,
    payload.status,
  );
  if (existing.member_id !== payload.member_id) {
    await syncScopeForAppointment(
      svc,
      existing.member_id,
      existing.chapter_id,
      existing.role_key,
      "ended",
    );
  }
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
  const { data: existing } = await svc
    .from("committee_appointments")
    .select("member_id, chapter_id, role_key")
    .eq("id", id)
    .maybeSingle();
  if (!existing) throw new Error("Appointment not found.");

  const { error } = await svc
    .from("committee_appointments")
    .update({ status: "ended" })
    .eq("id", id);
  if (error) throw new Error(error.message);

  await syncScopeForAppointment(
    svc,
    existing.member_id,
    existing.chapter_id,
    existing.role_key,
    "ended",
  );
  revalidatePath("/admin/committee");
  revalidatePath("/admin/members");
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
  const { data: existing } = await svc
    .from("committee_appointments")
    .select("member_id, chapter_id, role_key")
    .eq("id", id)
    .maybeSingle();

  const { error } = await svc
    .from("committee_appointments")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);

  if (existing) {
    await syncScopeForAppointment(
      svc,
      existing.member_id,
      existing.chapter_id,
      existing.role_key,
      "ended",
    );
  }
  revalidatePath("/admin/committee");
  revalidatePath("/admin/members");
  if (ctx.activeChapter?.slug) revalidatePath(`/${ctx.activeChapter.slug}`);
}
