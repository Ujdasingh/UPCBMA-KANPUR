"use server";

/**
 * Server actions for agenda engagement: voting + comments.
 *
 * All write paths require a signed-in member. The DB has its own RLS
 * policies as a backstop, but we re-check here so the failure is a clean
 * 401-style error string instead of a generic policy violation.
 */

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { getAuthedMember } from "@/lib/auth";
import {
  COMMENT_EDIT_WINDOW_MS,
  computeMemberVoteWeight,
} from "@/lib/agenda-engagement";
import { sendEmail, escapeHtml } from "@/lib/email";
import { chapterAdmins } from "@/lib/notify";

// ──────────────────────────────────────────────────────────────────────
// VOTING
// ──────────────────────────────────────────────────────────────────────

/**
 * Cast or change the caller's vote on an agenda. Pass the same direction
 * twice to *remove* the vote — UX matches Reddit/YouTube where clicking
 * an already-active arrow toggles it off.
 */
export async function castAgendaVote(
  agendaId: string,
  direction: "up" | "down",
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!agendaId || (direction !== "up" && direction !== "down")) {
    return { ok: false, error: "Bad request." };
  }
  const me = await getAuthedMember();
  if (!me) return { ok: false, error: "Sign in to vote." };

  const svc = createServiceClient();

  // Look up the existing vote to decide insert / update / delete.
  const { data: existing } = await svc
    .from("agenda_votes")
    .select("vote")
    .eq("agenda_id", agendaId)
    .eq("member_id", me.id)
    .maybeSingle();

  // Snapshot the current weight so a later role change doesn't retro-edit
  // historical totals. computeMemberVoteWeight returns 1/2/3 based on
  // active committee role.
  const weight = await computeMemberVoteWeight(me.id);

  if (existing?.vote === direction) {
    // Toggle off — remove the row entirely so the count drops.
    const { error } = await svc
      .from("agenda_votes")
      .delete()
      .eq("agenda_id", agendaId)
      .eq("member_id", me.id);
    if (error) return { ok: false, error: error.message };
  } else if (existing) {
    // Switch direction. Re-snapshot the weight in case the member's
    // committee role has changed since their last vote on this agenda.
    const updatePayload: Record<string, unknown> = { vote: direction, weight };
    let { error } = await svc
      .from("agenda_votes")
      .update(updatePayload)
      .eq("agenda_id", agendaId)
      .eq("member_id", me.id);
    if (error && /weight/i.test(error.message)) {
      // Migration not yet applied — drop the column and retry.
      delete updatePayload.weight;
      ({ error } = await svc
        .from("agenda_votes")
        .update(updatePayload)
        .eq("agenda_id", agendaId)
        .eq("member_id", me.id));
    }
    if (error) return { ok: false, error: error.message };
  } else {
    // First vote.
    const insertPayload: Record<string, unknown> = {
      agenda_id: agendaId,
      member_id: me.id,
      vote: direction,
      weight,
    };
    let { error } = await svc.from("agenda_votes").insert(insertPayload);
    if (error && /weight/i.test(error.message)) {
      delete insertPayload.weight;
      ({ error } = await svc.from("agenda_votes").insert(insertPayload));
    }
    if (error) return { ok: false, error: error.message };
  }

  // Slug + index + chapter routes all render vote totals.
  revalidatePath("/agendas");
  revalidatePath(`/agendas/[slug]`, "page");
  revalidatePath(`/[slug]`, "page");
  return { ok: true };
}

// ──────────────────────────────────────────────────────────────────────
// COMMENTS
// ──────────────────────────────────────────────────────────────────────

const MAX_COMMENT_LEN = 4000;

/**
 * Post a new comment on an agenda. Optionally a reply to another comment
 * via parent_id (one level of nesting in the UI). Best-effort emails the
 * agenda's proposer + the chapter committee on every new top-level
 * comment; reply emails go to the parent commenter too.
 */
export async function postAgendaComment(
  agendaId: string,
  body: string,
  parentId?: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const me = await getAuthedMember();
  if (!me) return { ok: false, error: "Sign in to comment." };

  const trimmed = (body ?? "").trim();
  if (!trimmed) return { ok: false, error: "Write something first." };
  if (trimmed.length > MAX_COMMENT_LEN) {
    return {
      ok: false,
      error: `Comments are capped at ${MAX_COMMENT_LEN} characters.`,
    };
  }

  const svc = createServiceClient();

  // Validate the parent if one was supplied — must belong to the same
  // agenda and be visible (not hidden). Defends against client tampering.
  let validatedParentId: string | null = null;
  if (parentId) {
    const { data: parent } = await svc
      .from("agenda_comments")
      .select("agenda_id, hidden, member_id")
      .eq("id", parentId)
      .maybeSingle();
    if (!parent || parent.hidden || parent.agenda_id !== agendaId) {
      return { ok: false, error: "Parent comment not found." };
    }
    validatedParentId = parentId;
  }

  const insertPayload: Record<string, unknown> = {
    agenda_id: agendaId,
    member_id: me.id,
    body: trimmed,
  };
  if (validatedParentId) insertPayload.parent_id = validatedParentId;

  const { error } = await svc.from("agenda_comments").insert(insertPayload);
  if (error) return { ok: false, error: error.message };

  // Notifications — fire-and-forget so a flaky SMTP doesn't fail the post.
  notifyComment(agendaId, me.name, trimmed, validatedParentId).catch(() => {});

  // Both index and individual slug pages render comments — invalidate
  // both layers so the count updates on the next page hit instead of
  // waiting out the 60s `revalidate` window.
  revalidatePath(`/agendas`);
  revalidatePath(`/agendas/[slug]`, "page");
  return { ok: true };
}

/**
 * Email the agenda proposer + chapter committee + the parent commenter
 * (when this is a reply) about a new comment. All looked up via service
 * role; the actual delivery is best-effort.
 */
async function notifyComment(
  agendaId: string,
  authorName: string,
  body: string,
  parentId: string | null,
) {
  const svc = createServiceClient();

  const { data: agenda } = await svc
    .from("agendas")
    .select("title, slug, chapter_id, created_by")
    .eq("id", agendaId)
    .maybeSingle();
  if (!agenda) return;

  // Recipients: proposer + chapter admins (or state-wide admins for state
  // agendas) + parent commenter when this is a reply. De-duped lower-case.
  const targets = new Set<string>();

  if (agenda.created_by) {
    const { data: proposer } = await svc
      .from("members")
      .select("email")
      .eq("id", agenda.created_by)
      .maybeSingle();
    if (proposer?.email) targets.add(proposer.email.toLowerCase().trim());
  }

  if (agenda.chapter_id) {
    const admins = await chapterAdmins(agenda.chapter_id);
    admins.forEach((a) => targets.add(a));
  } else {
    // State-wide agenda: pull every active admin/super_admin email.
    const { data: stateAdmins } = await svc
      .from("members")
      .select("email")
      .in("role", ["admin", "super_admin"])
      .eq("active", true);
    (stateAdmins ?? []).forEach((m) => {
      if (m.email) targets.add(m.email.toLowerCase().trim());
    });
  }

  if (parentId) {
    const { data: parent } = await svc
      .from("agenda_comments")
      .select("member:members!agenda_comments_member_id_fkey(email)")
      .eq("id", parentId)
      .maybeSingle();
    const parentMember = Array.isArray(parent?.member)
      ? parent?.member[0]
      : parent?.member;
    if (parentMember && (parentMember as { email?: string }).email) {
      targets.add(
        (parentMember as { email: string }).email.toLowerCase().trim(),
      );
    }
  }

  if (targets.size === 0) return;

  const url =
    (process.env.NEXT_PUBLIC_SITE_URL ?? "https://upcbma.com") +
    `/agendas/${agenda.slug}#comments`;

  await sendEmail({
    to: Array.from(targets),
    subject: `[UPCBMA] New comment on "${agenda.title}"`,
    text: [
      `${authorName} left a new comment on "${agenda.title}".`,
      ``,
      body.length > 600 ? body.slice(0, 600) + "…" : body,
      ``,
      `Read the full thread or reply: ${url}`,
    ].join("\n"),
    html: `
      <p><strong>${escapeHtml(authorName)}</strong> left a new comment on
      <a href="${url}" style="color:#0d6b3e">${escapeHtml(agenda.title)}</a>.</p>
      <blockquote style="margin:12px 0;padding:8px 14px;border-left:3px solid #d6cfb6;color:#333;background:#fafaf6;font-size:14px;line-height:1.55;white-space:pre-wrap">${escapeHtml(body.length > 800 ? body.slice(0, 800) + "…" : body)}</blockquote>
      <p style="font-size:13px;margin-top:16px">
        <a href="${url}" style="color:#0d6b3e">Read the full thread or reply →</a>
      </p>
    `,
    tag: "agenda_comment_notification",
  });
}

/**
 * Edit your own comment. 15-minute window (matches the helper's
 * COMMENT_EDIT_WINDOW_MS). Admins can edit beyond it via a future admin
 * surface; for now this is member-only.
 */
export async function editAgendaComment(
  commentId: string,
  body: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const me = await getAuthedMember();
  if (!me) return { ok: false, error: "Sign in to edit." };
  const trimmed = (body ?? "").trim();
  if (!trimmed) return { ok: false, error: "Write something first." };
  if (trimmed.length > MAX_COMMENT_LEN) {
    return {
      ok: false,
      error: `Comments are capped at ${MAX_COMMENT_LEN} characters.`,
    };
  }

  const svc = createServiceClient();
  const { data: existing } = await svc
    .from("agenda_comments")
    .select("member_id, posted_at, hidden")
    .eq("id", commentId)
    .maybeSingle();
  if (!existing) return { ok: false, error: "Comment not found." };
  if (existing.hidden)
    return { ok: false, error: "This comment was removed." };
  if (existing.member_id !== me.id)
    return { ok: false, error: "You can only edit your own comments." };
  const ageMs = Date.now() - new Date(existing.posted_at).getTime();
  if (ageMs > COMMENT_EDIT_WINDOW_MS) {
    return {
      ok: false,
      error: "Edit window has passed. Ask an admin if you need a fix.",
    };
  }

  const { error } = await svc
    .from("agenda_comments")
    .update({ body: trimmed })
    .eq("id", commentId);
  if (error) return { ok: false, error: error.message };

  // Both index and individual slug pages render comments — invalidate
  // both layers so the count updates on the next page hit instead of
  // waiting out the 60s `revalidate` window.
  revalidatePath(`/agendas`);
  revalidatePath(`/agendas/[slug]`, "page");
  return { ok: true };
}

/**
 * Soft-delete a comment. Members can delete their own at any time;
 * admins can delete anyone's.
 */
export async function deleteAgendaComment(
  commentId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const me = await getAuthedMember();
  if (!me) return { ok: false, error: "Sign in first." };

  const svc = createServiceClient();
  const { data: existing } = await svc
    .from("agenda_comments")
    .select("member_id, hidden")
    .eq("id", commentId)
    .maybeSingle();
  if (!existing) return { ok: false, error: "Comment not found." };
  if (existing.hidden) return { ok: true }; // idempotent.

  const isAdmin = me.role === "admin" || me.role === "super_admin";
  if (!isAdmin && existing.member_id !== me.id) {
    return {
      ok: false,
      error: "You can only delete your own comments.",
    };
  }

  const { error } = await svc
    .from("agenda_comments")
    .update({ hidden: true, hidden_by: me.id })
    .eq("id", commentId);
  if (error) return { ok: false, error: error.message };

  // Both index and individual slug pages render comments — invalidate
  // both layers so the count updates on the next page hit instead of
  // waiting out the 60s `revalidate` window.
  revalidatePath(`/agendas`);
  revalidatePath(`/agendas/[slug]`, "page");
  return { ok: true };
}
