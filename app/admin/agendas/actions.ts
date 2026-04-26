"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { canApproveAgenda, getAdminContext } from "@/lib/auth";
import { slugifyAgenda } from "@/lib/agendas";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

function isRedirect(e: unknown): boolean {
  const d = (e as { digest?: string } | undefined)?.digest;
  return typeof d === "string" && d.startsWith("NEXT_REDIRECT");
}
function fail(msg: string): never {
  redirect("/admin/agendas?error=" + encodeURIComponent(msg));
}
function ok(msg: string): never {
  redirect("/admin/agendas?ok=" + encodeURIComponent(msg));
}

function parseForm(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const slugRaw = String(formData.get("slug") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim() || null;
  const body = String(formData.get("body") ?? "").trim() || null;
  const image_url = String(formData.get("image_url") ?? "").trim() || null;
  const category = String(formData.get("category") ?? "other");
  const status = String(formData.get("status") ?? "active");
  const priority = String(formData.get("priority") ?? "medium");
  const visibility = String(formData.get("visibility") ?? "public");
  const required_approvals = Math.max(1, Number(formData.get("required_approvals") ?? 1));
  const startedRaw = String(formData.get("started_on") ?? "").trim();
  const targetRaw = String(formData.get("target_resolution_on") ?? "").trim();
  const resolvedRaw = String(formData.get("resolved_on") ?? "").trim();

  return {
    title,
    slug: slugRaw || slugifyAgenda(title),
    summary,
    body,
    image_url,
    category,
    status,
    priority,
    visibility,
    required_approvals,
    started_on: startedRaw || new Date().toISOString().slice(0, 10),
    target_resolution_on: targetRaw || null,
    resolved_on: resolvedRaw || null,
  };
}

export async function createAgenda(formData: FormData) {
  try {
    const ctx = await getAdminContext();
    const p = parseForm(formData);
    if (!p.title) fail("Title is required.");
    if (!p.slug) fail("Slug is required.");

    const svc = createServiceClient();
    // Admin-created agendas are auto-approved.
    const { error } = await svc.from("agendas").insert({
      ...p,
      chapter_id: ctx.activeChapterId,
      created_by: ctx.me.id,
      approval_status: "approved",
      approved_at: new Date().toISOString(),
    });
    if (error) {
      if (error.code === "23505")
        fail(`Slug "${p.slug}" is already taken — pick a different one.`);
      fail(error.message);
    }
    revalidatePath("/admin/agendas");
    revalidatePath("/agendas");
    if (ctx.activeChapter?.slug) revalidatePath(`/${ctx.activeChapter.slug}/agendas`);
    ok("Agenda created.");
  } catch (e) {
    if (isRedirect(e)) throw e;
    fail(e instanceof Error ? e.message : String(e));
  }
}

export async function updateAgenda(id: string, formData: FormData) {
  try {
    await getAdminContext();
    const p = parseForm(formData);
    const svc = createServiceClient();
    const { error } = await svc
      .from("agendas")
      .update({ ...p, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) fail(error.message);
    revalidatePath("/admin/agendas");
    revalidatePath(`/admin/agendas/${id}`);
    revalidatePath("/agendas");
    revalidatePath(`/agendas/${p.slug}`);
    ok("Agenda updated.");
  } catch (e) {
    if (isRedirect(e)) throw e;
    fail(e instanceof Error ? e.message : String(e));
  }
}

export async function deleteAgenda(id: string) {
  try {
    await getAdminContext();
    const svc = createServiceClient();
    const { error } = await svc.from("agendas").delete().eq("id", id);
    if (error) fail(error.message);
    revalidatePath("/admin/agendas");
    revalidatePath("/agendas");
    ok("Agenda deleted.");
  } catch (e) {
    if (isRedirect(e)) throw e;
    fail(e instanceof Error ? e.message : String(e));
  }
}

// -------- Updates posted under an agenda --------

export async function postUpdate(agendaId: string, formData: FormData) {
  try {
    const ctx = await getAdminContext();
    const title = String(formData.get("update_title") ?? "").trim();
    const body = String(formData.get("update_body") ?? "").trim() || null;
    const type = String(formData.get("update_type") ?? "update");
    if (!title) {
      redirect(`/admin/agendas/${agendaId}?error=` + encodeURIComponent("Update title is required."));
    }
    const svc = createServiceClient();
    const { error } = await svc.from("agenda_updates").insert({
      agenda_id: agendaId,
      type,
      title,
      body,
      posted_by: ctx.me.id,
    });
    if (error) {
      redirect(`/admin/agendas/${agendaId}?error=` + encodeURIComponent(error.message));
    }
    // Get slug for revalidation
    const { data: a } = await svc.from("agendas").select("slug, chapter_id").eq("id", agendaId).maybeSingle();
    revalidatePath(`/admin/agendas/${agendaId}`);
    if (a?.slug) revalidatePath(`/agendas/${a.slug}`);
    redirect(`/admin/agendas/${agendaId}?ok=` + encodeURIComponent("Update posted."));
  } catch (e) {
    if (isRedirect(e)) throw e;
    redirect(`/admin/agendas/${agendaId}?error=` + encodeURIComponent(e instanceof Error ? e.message : String(e)));
  }
}

export async function deleteUpdate(updateId: string, agendaId: string) {
  await getAdminContext();
  const svc = createServiceClient();
  await svc.from("agenda_updates").delete().eq("id", updateId);
  revalidatePath(`/admin/agendas/${agendaId}`);
}

// -------- Comment moderation --------

export async function toggleHideComment(commentId: string, agendaId: string, hide: boolean) {
  const ctx = await getAdminContext();
  const svc = createServiceClient();
  await svc
    .from("agenda_comments")
    .update({ hidden: hide, hidden_by: hide ? ctx.me.id : null })
    .eq("id", commentId);
  revalidatePath(`/admin/agendas/${agendaId}`);
}

// -------- Approval workflow --------

export async function approveAgenda(agendaId: string, formData: FormData) {
  const notes = String(formData.get("notes") ?? "").trim() || null;
  await decideAgenda(agendaId, "approved", notes);
}

export async function rejectAgenda(agendaId: string, formData: FormData) {
  const notes = String(formData.get("notes") ?? "").trim() || null;
  await decideAgenda(agendaId, "rejected", notes);
}

export async function requestChanges(agendaId: string, formData: FormData) {
  const notes = String(formData.get("notes") ?? "").trim() || null;
  await decideAgenda(agendaId, "changes_requested", notes);
}

async function decideAgenda(
  agendaId: string,
  decision: "approved" | "rejected" | "changes_requested",
  notes: string | null,
) {
  const ctx = await getAdminContext();
  const svc = createServiceClient();

  const { data: agenda } = await svc
    .from("agendas")
    .select("id, chapter_id, required_approvals, approval_status, slug")
    .eq("id", agendaId)
    .maybeSingle();
  if (!agenda) {
    redirect(`/admin/agendas?error=Unknown+agenda`);
  }

  const allowed = await canApproveAgenda(ctx.me, agenda.chapter_id);
  if (!allowed) {
    redirect(`/admin/agendas/${agendaId}?error=` + encodeURIComponent("You don't have approval rights for this agenda."));
  }

  // Record this decision (one row per (agenda, approver))
  await svc
    .from("agenda_approvals")
    .upsert(
      {
        agenda_id: agendaId,
        approver_id: ctx.me.id,
        decision,
        notes,
      },
      { onConflict: "agenda_id,approver_id" },
    );

  // Recompute aggregate status:
  // - any "rejected" → rejected
  // - any "changes_requested" with no later "approved" by same approver → changes_requested
  // - count of "approved" >= required_approvals → approved
  // - else stay pending
  const { data: rows } = await svc
    .from("agenda_approvals")
    .select("decision")
    .eq("agenda_id", agendaId);
  const decisions = (rows ?? []).map((r) => r.decision);
  const approvals = decisions.filter((d) => d === "approved").length;
  const anyRejected = decisions.includes("rejected");
  const anyChanges = decisions.includes("changes_requested");

  let newStatus: "approved" | "rejected" | "changes_requested" | "pending" = "pending";
  if (anyRejected) newStatus = "rejected";
  else if (approvals >= (agenda.required_approvals ?? 1)) newStatus = "approved";
  else if (anyChanges) newStatus = "changes_requested";

  const updates: Record<string, unknown> = {
    approval_status: newStatus,
    updated_at: new Date().toISOString(),
  };
  if (newStatus === "approved") updates.approved_at = new Date().toISOString();
  if (newStatus === "rejected") updates.rejected_at = new Date().toISOString();

  await svc.from("agendas").update(updates).eq("id", agendaId);

  await svc.from("admin_audit_log").insert({
    actor_id: ctx.realActor.id,
    acting_as_id: ctx.isImpersonating ? ctx.me.id : null,
    action: `agenda_${decision}`,
    target_table: "agendas",
    target_id: agendaId,
    diff: { decision, notes, new_status: newStatus },
  }).then(() => null).catch(() => null);

  revalidatePath(`/admin/agendas/${agendaId}`);
  revalidatePath("/admin/agendas");
  revalidatePath("/agendas");
  if (agenda.slug) revalidatePath(`/agendas/${agenda.slug}`);

  redirect(
    `/admin/agendas/${agendaId}?ok=` +
      encodeURIComponent(`Recorded ${decision.replace("_", " ")} (status: ${newStatus}).`),
  );
}
