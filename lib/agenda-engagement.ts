/**
 * Helpers for fetching agenda voting + comment data.
 *
 * Aligns with the existing schema in migration-agendas.sql:
 *   agenda_comments(id, agenda_id, member_id, parent_id, body,
 *                   posted_at, hidden, hidden_by, updated_at)
 *   agenda_votes(agenda_id, member_id, vote, created_at, updated_at)
 *                                       — added by 2026_05_03 migration
 */

import { createServiceClient } from "@/lib/supabase/server";
import { getAuthedMember } from "@/lib/auth";

export type AgendaVoteSummary = {
  up: number;
  down: number;
  /** The signed-in member's current vote, if any. */
  myVote: "up" | "down" | null;
};

export type AgendaComment = {
  id: string;
  agenda_id: string;
  member_id: string;
  body: string;
  posted_at: string;
  /** Present when the comment has been edited at least once. */
  edited: boolean;
  member: {
    id: string;
    name: string;
    photo_url: string | null;
    company: string | null;
    role: string;
  } | null;
  /** Whether the signed-in viewer is allowed to edit (own + within window). */
  canEdit: boolean;
  /** Whether the signed-in viewer can delete (own OR admin). */
  canDelete: boolean;
};

export const COMMENT_EDIT_WINDOW_MS = 15 * 60 * 1000;

/**
 * Vote totals for an agenda, plus the caller's own vote if signed in.
 */
export async function getVoteSummary(
  agendaId: string,
): Promise<AgendaVoteSummary> {
  const svc = createServiceClient();
  const me = await getAuthedMember();

  const [allVotes, myVoteRow] = await Promise.all([
    svc.from("agenda_votes").select("vote").eq("agenda_id", agendaId),
    me
      ? svc
          .from("agenda_votes")
          .select("vote")
          .eq("agenda_id", agendaId)
          .eq("member_id", me.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  let up = 0;
  let down = 0;
  for (const v of allVotes.data ?? []) {
    if (v.vote === "up") up++;
    else if (v.vote === "down") down++;
  }

  return {
    up,
    down,
    myVote: (myVoteRow.data?.vote as "up" | "down" | undefined) ?? null,
  };
}

/**
 * Same as getVoteSummary but for many agendas at once. Used on the chapter
 * page where we render multiple agenda cards.
 */
export async function getVoteSummariesByAgenda(
  agendaIds: string[],
): Promise<Map<string, AgendaVoteSummary>> {
  const out = new Map<string, AgendaVoteSummary>();
  if (agendaIds.length === 0) return out;

  const svc = createServiceClient();
  const me = await getAuthedMember();

  const [{ data: allVotes }, { data: myVotes }] = await Promise.all([
    svc
      .from("agenda_votes")
      .select("agenda_id, vote")
      .in("agenda_id", agendaIds),
    me
      ? svc
          .from("agenda_votes")
          .select("agenda_id, vote")
          .in("agenda_id", agendaIds)
          .eq("member_id", me.id)
      : Promise.resolve({ data: [] as { agenda_id: string; vote: string }[] }),
  ]);

  for (const id of agendaIds) {
    out.set(id, { up: 0, down: 0, myVote: null });
  }
  for (const v of allVotes ?? []) {
    const s = out.get(v.agenda_id);
    if (!s) continue;
    if (v.vote === "up") s.up++;
    else if (v.vote === "down") s.down++;
  }
  for (const v of (myVotes as { agenda_id: string; vote: string }[]) ?? []) {
    const s = out.get(v.agenda_id);
    if (!s) continue;
    s.myVote = v.vote === "up" ? "up" : v.vote === "down" ? "down" : null;
  }
  return out;
}

/**
 * Visible (non-hidden) comments for an agenda, joined to the member's
 * profile so the UI doesn't have to N+1.
 *
 * The schema doesn't have an `updated_at` column on older deployments —
 * we tolerate that gracefully by treating "edited" as `false` if the
 * field is missing.
 */
export async function listAgendaComments(
  agendaId: string,
): Promise<AgendaComment[]> {
  const svc = createServiceClient();
  const me = await getAuthedMember();
  const isAdmin =
    !!me && (me.role === "admin" || me.role === "super_admin");

  // Try the richer query first; fall back if updated_at column hasn't been
  // added yet (the engagement migration may not have been applied).
  let rows: RawComment[] | null = null;
  let attempt = await svc
    .from("agenda_comments")
    .select(
      "id, agenda_id, member_id, body, posted_at, updated_at, member:members(id, name, photo_url, company, role)",
    )
    .eq("agenda_id", agendaId)
    .eq("hidden", false)
    .order("posted_at", { ascending: true });
  if (attempt.error) {
    attempt = await svc
      .from("agenda_comments")
      .select(
        "id, agenda_id, member_id, body, posted_at, member:members(id, name, photo_url, company, role)",
      )
      .eq("agenda_id", agendaId)
      .eq("hidden", false)
      .order("posted_at", { ascending: true });
  }
  rows = (attempt.data as unknown as RawComment[]) ?? [];

  const now = Date.now();
  return rows.map((c) => {
    const member = Array.isArray(c.member) ? c.member[0] : c.member;
    const isOwn = me?.id === c.member_id;
    const ageMs = now - new Date(c.posted_at).getTime();
    const withinWindow = ageMs <= COMMENT_EDIT_WINDOW_MS;
    const edited =
      !!c.updated_at &&
      Math.abs(
        new Date(c.updated_at).getTime() - new Date(c.posted_at).getTime(),
      ) > 1000;
    return {
      id: c.id,
      agenda_id: c.agenda_id,
      member_id: c.member_id,
      body: c.body,
      posted_at: c.posted_at,
      edited,
      member: member
        ? {
            id: member.id,
            name: member.name,
            photo_url: member.photo_url ?? null,
            company: member.company ?? null,
            role: member.role,
          }
        : null,
      canEdit: !!isOwn && withinWindow,
      canDelete: !!isOwn || isAdmin,
    };
  });
}

type RawComment = {
  id: string;
  agenda_id: string;
  member_id: string;
  body: string;
  posted_at: string;
  updated_at?: string | null;
  member:
    | {
        id: string;
        name: string;
        photo_url: string | null;
        company: string | null;
        role: string;
      }
    | Array<{
        id: string;
        name: string;
        photo_url: string | null;
        company: string | null;
        role: string;
      }>
    | null;
};
