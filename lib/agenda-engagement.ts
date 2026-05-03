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
  /** Number of distinct members voting up — democratic count, shown publicly. */
  up: number;
  /** Number of distinct members voting down. */
  down: number;
  /** Sum of weights of up-votes (committee voters count more). */
  upWeighted: number;
  /** Sum of weights of down-votes. */
  downWeighted: number;
  /** The signed-in member's current vote, if any. */
  myVote: "up" | "down" | null;
};

/**
 * Officer roles get the highest weight. Other active committee roles get a
 * mid weight. Plain members are 1. Match this set to AUTO_ADMIN_ROLES in
 * app/admin/committee/actions.ts so the "officer" tier stays coherent.
 */
const OFFICER_ROLES = new Set(["president", "secretary", "treasurer"]);

/**
 * Look up the current vote weight for a member based on their *active*
 * committee appointments today. Snapshotted at vote time by the action;
 * exported here so other surfaces can preview the weight before voting.
 */
export async function computeMemberVoteWeight(
  memberId: string,
): Promise<number> {
  const svc = createServiceClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await svc
    .from("committee_appointments")
    .select("role_key")
    .eq("member_id", memberId)
    .eq("status", "active")
    .lte("term_start", today)
    .gte("term_end", today);
  if (!data || data.length === 0) return 1;
  if (data.some((a) => OFFICER_ROLES.has(a.role_key))) return 3;
  return 2;
}

export type AgendaComment = {
  id: string;
  agenda_id: string;
  member_id: string;
  /** When non-null, this is a reply to the referenced comment. */
  parent_id: string | null;
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
    // Tolerate the older schema where `weight` doesn't exist yet — fall
    // back to a plain `vote` select if the rich one fails.
    svc
      .from("agenda_votes")
      .select("vote, weight")
      .eq("agenda_id", agendaId)
      .then((r) =>
        r.error
          ? svc.from("agenda_votes").select("vote").eq("agenda_id", agendaId)
          : r,
      ),
    me
      ? svc
          .from("agenda_votes")
          .select("vote")
          .eq("agenda_id", agendaId)
          .eq("member_id", me.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return {
    ...tallyVotes(allVotes.data ?? []),
    myVote: (myVoteRow.data?.vote as "up" | "down" | undefined) ?? null,
  };
}

function tallyVotes(rows: { vote: string; weight?: number | null }[]) {
  let up = 0;
  let down = 0;
  let upWeighted = 0;
  let downWeighted = 0;
  for (const v of rows) {
    const w = v.weight ?? 1;
    if (v.vote === "up") {
      up++;
      upWeighted += w;
    } else if (v.vote === "down") {
      down++;
      downWeighted += w;
    }
  }
  return { up, down, upWeighted, downWeighted };
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

  const [allVotesResp, { data: myVotes }] = await Promise.all([
    svc
      .from("agenda_votes")
      .select("agenda_id, vote, weight")
      .in("agenda_id", agendaIds)
      .then((r) =>
        r.error
          ? svc
              .from("agenda_votes")
              .select("agenda_id, vote")
              .in("agenda_id", agendaIds)
          : r,
      ),
    me
      ? svc
          .from("agenda_votes")
          .select("agenda_id, vote")
          .in("agenda_id", agendaIds)
          .eq("member_id", me.id)
      : Promise.resolve({ data: [] as { agenda_id: string; vote: string }[] }),
  ]);

  for (const id of agendaIds) {
    out.set(id, {
      up: 0,
      down: 0,
      upWeighted: 0,
      downWeighted: 0,
      myVote: null,
    });
  }
  type Row = { agenda_id: string; vote: string; weight?: number | null };
  for (const v of (allVotesResp.data as Row[]) ?? []) {
    const s = out.get(v.agenda_id);
    if (!s) continue;
    const w = v.weight ?? 1;
    if (v.vote === "up") {
      s.up++;
      s.upWeighted += w;
    } else if (v.vote === "down") {
      s.down++;
      s.downWeighted += w;
    }
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
      "id, agenda_id, member_id, parent_id, body, posted_at, updated_at, member:members(id, name, photo_url, company, role)",
    )
    .eq("agenda_id", agendaId)
    .eq("hidden", false)
    .order("posted_at", { ascending: true });
  if (attempt.error) {
    attempt = await svc
      .from("agenda_comments")
      .select(
        "id, agenda_id, member_id, parent_id, body, posted_at, member:members(id, name, photo_url, company, role)",
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
      parent_id: c.parent_id ?? null,
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
  parent_id: string | null;
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
