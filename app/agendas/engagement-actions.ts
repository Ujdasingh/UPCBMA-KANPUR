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
import { COMMENT_EDIT_WINDOW_MS } from "@/lib/agenda-engagement";

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

  if (existing?.vote === direction) {
    // Toggle off — remove the row entirely so the count drops.
    const { error } = await svc
      .from("agenda_votes")
      .delete()
      .eq("agenda_id", agendaId)
      .eq("member_id", me.id);
    if (error) return { ok: false, error: error.message };
  } else if (existing) {
    // Switch direction.
    const { error } = await svc
      .from("agenda_votes")
      .update({ vote: direction })
      .eq("agenda_id", agendaId)
      .eq("member_id", me.id);
    if (error) return { ok: false, error: error.message };
  } else {
    // First vote.
    const { error } = await svc.from("agenda_votes").insert({
      agenda_id: agendaId,
      member_id: me.id,
      vote: direction,
    });
    if (error) return { ok: false, error: error.message };
  }

  // Slug + chapter routes both render vote totals. Slug is the most-hit
  // surface; we revalidate the index too so the count tile stays fresh.
  revalidatePath("/agendas");
  // /agendas/[slug] will revalidate when the route is re-entered.
  return { ok: true };
}

// ──────────────────────────────────────────────────────────────────────
// COMMENTS
// ──────────────────────────────────────────────────────────────────────

const MAX_COMMENT_LEN = 4000;

/**
 * Post a new comment on an agenda. Returns the new row so the client can
 * append it without refetching.
 */
export async function postAgendaComment(
  agendaId: string,
  body: string,
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
  const { error } = await svc.from("agenda_comments").insert({
    agenda_id: agendaId,
    member_id: me.id,
    body: trimmed,
  });
  if (error) return { ok: false, error: error.message };

  // Best-effort revalidate. Detail page is the only one that lists comments
  // right now, so be specific to keep CDN cache effective elsewhere.
  revalidatePath(`/agendas`);
  return { ok: true };
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

  revalidatePath(`/agendas`);
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

  revalidatePath(`/agendas`);
  return { ok: true };
}
