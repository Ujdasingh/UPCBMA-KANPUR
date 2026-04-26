import { createClient, createServiceClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  ACTIVE_CHAPTER_ALL,
  ACTIVE_CHAPTER_COOKIE,
  type AdminScope,
  type Chapter,
} from "@/lib/chapters";
import { IMPERSONATE_COOKIE } from "@/lib/impersonate";

export type MemberRole = "member" | "admin" | "super_admin";

export type AuthedMember = {
  id: string;
  name: string;
  email: string;
  role: MemberRole;
  auth_user_id: string;
};

/**
 * Resolve the logged-in auth user to their `members` row.
 * Honours super_admin impersonation: if the real user is a super_admin and
 * has the impersonate cookie set, the returned identity is the target member.
 *
 * Redirects to /login if no session, / if not an admin.
 */
export async function getAuthedAdmin(): Promise<AuthedMember> {
  const { effective } = await resolveAuthIdentity();
  return effective;
}

/**
 * Resolve BOTH the real caller and the effective identity (respecting
 * super_admin impersonation). Use this when the UI needs to show "Viewing as"
 * banners or when mutations need to audit both identities.
 */
export async function resolveAuthIdentity(): Promise<{
  real: AuthedMember;
  effective: AuthedMember;
  isImpersonating: boolean;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const svc = createServiceClient();
  const { data: realRow } = await svc
    .from("members")
    .select("id, name, email, role, auth_user_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (
    !realRow ||
    (realRow.role !== "admin" && realRow.role !== "super_admin")
  ) {
    redirect("/");
  }
  const real = realRow as AuthedMember;

  // Impersonation: only super_admin can do it.
  const cookieStore = await cookies();
  const impersonateId = cookieStore.get(IMPERSONATE_COOKIE)?.value;
  if (impersonateId && real.role === "super_admin") {
    const { data: target } = await svc
      .from("members")
      .select("id, name, email, role, auth_user_id")
      .eq("id", impersonateId)
      .maybeSingle();
    if (target) {
      return {
        real,
        effective: target as AuthedMember,
        isImpersonating: true,
      };
    }
  }

  return { real, effective: real, isImpersonating: false };
}

export function isSuperAdmin(
  m: { role: MemberRole } | null | undefined,
): boolean {
  return m?.role === "super_admin";
}

// -------- Admin context (multi-chapter scope) --------

export type AdminContext = {
  me: AuthedMember;
  /** The real caller — different from me when impersonating. */
  realActor: AuthedMember;
  isImpersonating: boolean;
  isSuper: boolean;
  scopes: AdminScope[];
  availableChapters: Chapter[];
  canSeeAllChapters: boolean;
  activeChapterId: string | null;
  activeChapter: Chapter | null;
};

export async function getAdminContext(): Promise<AdminContext> {
  const { real, effective, isImpersonating } = await resolveAuthIdentity();
  const me = effective;
  const svc = createServiceClient();
  const isSuper = isSuperAdmin(me);

  const { data: scopeRows } = await svc
    .from("admin_scopes")
    .select("id, member_id, chapter_id, granted_at, granted_by")
    .eq("member_id", me.id);
  const scopes: AdminScope[] = scopeRows ?? [];

  const hasStateScope =
    isSuper || scopes.some((s) => s.chapter_id === null);

  let chaptersQuery = svc
    .from("chapters")
    .select(
      "id, slug, name, city, state, established_on, logo_url, accent_color, active, display_order",
    )
    .eq("active", true)
    .order("display_order", { ascending: true });

  if (!hasStateScope) {
    const allowedIds = scopes
      .filter((s) => s.chapter_id !== null)
      .map((s) => s.chapter_id as string);
    if (allowedIds.length === 0) {
      redirect("/");
    }
    chaptersQuery = chaptersQuery.in("id", allowedIds);
  }
  const { data: availableChapters } = await chaptersQuery;

  const cookieStore = await cookies();
  const cookieVal = cookieStore.get(ACTIVE_CHAPTER_COOKIE)?.value;

  let activeChapterId: string | null = null;
  let activeChapter: Chapter | null = null;
  if (cookieVal && cookieVal !== ACTIVE_CHAPTER_ALL) {
    const match = (availableChapters ?? []).find((c) => c.slug === cookieVal);
    if (match) {
      activeChapterId = match.id;
      activeChapter = match as Chapter;
    }
  }
  if (!activeChapterId && cookieVal !== ACTIVE_CHAPTER_ALL) {
    if (!hasStateScope && (availableChapters?.length ?? 0) >= 1) {
      const first = availableChapters![0]!;
      activeChapterId = first.id;
      activeChapter = first as Chapter;
    }
  }

  return {
    me,
    realActor: real,
    isImpersonating,
    isSuper,
    scopes,
    availableChapters: (availableChapters ?? []) as Chapter[],
    canSeeAllChapters: hasStateScope,
    activeChapterId,
    activeChapter,
  };
}

// -------- Mutation guards --------

export async function assertCanMutateMember(opts: {
  caller: AuthedMember;
  targetId?: string | null;
  incomingRole?: string | null;
}) {
  const { caller, targetId, incomingRole } = opts;
  const svc = createServiceClient();

  if (targetId) {
    const { data: target } = await svc
      .from("members")
      .select("id, role, auth_user_id")
      .eq("id", targetId)
      .maybeSingle();

    if (target?.role === "super_admin" && !isSuperAdmin(caller)) {
      throw new Error(
        "Forbidden: you do not have permission to modify this account.",
      );
    }

    if (
      target?.auth_user_id === caller.auth_user_id &&
      incomingRole &&
      incomingRole !== caller.role
    ) {
      throw new Error(
        "You cannot change your own role. Ask another super_admin to do it.",
      );
    }
  }

  if (incomingRole === "super_admin" && !isSuperAdmin(caller)) {
    throw new Error(
      "Forbidden: only a super_admin can assign the super_admin role.",
    );
  }
}

export function canActInChapter(ctx: AdminContext, chapterId: string): boolean {
  if (ctx.isSuper) return true;
  if (ctx.scopes.some((s) => s.chapter_id === null)) return true;
  return ctx.scopes.some((s) => s.chapter_id === chapterId);
}

// -------- Member-facing helpers (any logged-in user, not just admins) --------

export type AuthedMemberLite = AuthedMember & { photo_url?: string | null };

/**
 * Resolve the logged-in auth user to their `members` row. Unlike
 * getAuthedAdmin, this DOES NOT redirect — returns null when there's no
 * session, no member row, or only a non-admin role. Use for member-facing
 * actions (proposing agendas, commenting) where any logged-in member counts.
 */
export async function getAuthedMember(): Promise<AuthedMemberLite | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const svc = createServiceClient();
  const { data: member } = await svc
    .from("members")
    .select("id, name, email, role, auth_user_id, photo_url")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  return (member as AuthedMemberLite) ?? null;
}

/**
 * Can this member approve an agenda for the given chapter?
 *   - super_admin: always
 *   - admin with state-wide scope (admin_scopes.chapter_id IS NULL): always
 *   - admin with this chapter scoped: yes
 *   - explicit grant in agenda_approvers (chapter or state): yes
 */
export async function canApproveAgenda(
  member: AuthedMember,
  agendaChapterId: string | null,
): Promise<boolean> {
  if (member.role === "super_admin") return true;
  const svc = createServiceClient();

  if (member.role === "admin") {
    const { data: scopes } = await svc
      .from("admin_scopes")
      .select("chapter_id")
      .eq("member_id", member.id);
    const hasStateScope = (scopes ?? []).some((s) => s.chapter_id === null);
    if (hasStateScope) return true;
    if (
      agendaChapterId &&
      (scopes ?? []).some((s) => s.chapter_id === agendaChapterId)
    ) {
      return true;
    }
  }

  // Explicit agenda-approver grants for non-admins (or extra scopes for admins).
  const { data: explicit } = await svc
    .from("agenda_approvers")
    .select("chapter_id")
    .eq("member_id", member.id);
  const hasStateApprover = (explicit ?? []).some((s) => s.chapter_id === null);
  if (hasStateApprover) return true;
  if (
    agendaChapterId &&
    (explicit ?? []).some((s) => s.chapter_id === agendaChapterId)
  ) {
    return true;
  }
  return false;
}
