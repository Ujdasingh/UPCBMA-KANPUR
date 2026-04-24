import { createClient, createServiceClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  ACTIVE_CHAPTER_ALL,
  ACTIVE_CHAPTER_COOKIE,
  type AdminScope,
  type Chapter,
} from "@/lib/chapters";

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
 * Redirects to /login if no session, / if not an admin.
 */
export async function getAuthedAdmin(): Promise<AuthedMember> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const svc = createServiceClient();
  const { data: member } = await svc
    .from("members")
    .select("id, name, email, role, auth_user_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (
    !member ||
    (member.role !== "admin" && member.role !== "super_admin")
  ) {
    redirect("/");
  }
  return member as AuthedMember;
}

export function isSuperAdmin(
  m: { role: MemberRole } | null | undefined,
): boolean {
  return m?.role === "super_admin";
}

/**
 * Full multi-chapter admin context. Use this inside admin pages/actions that
 * need to know what chapter the admin is currently looking at.
 */
export type AdminContext = {
  me: AuthedMember;
  isSuper: boolean;
  /** Scopes from admin_scopes table (plus a synthetic "all" scope for super_admin). */
  scopes: AdminScope[];
  /** Chapters this admin can see. For super_admin + state-wide admins: all active chapters. */
  availableChapters: Chapter[];
  /** Can this admin switch to the "All chapters" state-wide view? */
  canSeeAllChapters: boolean;
  /** The currently-selected chapter id. NULL when the admin is in state-wide view. */
  activeChapterId: string | null;
  /** The active chapter row if a specific chapter is selected. */
  activeChapter: Chapter | null;
};

export async function getAdminContext(): Promise<AdminContext> {
  const me = await getAuthedAdmin();
  const svc = createServiceClient();
  const isSuper = isSuperAdmin(me);

  // Load this admin's scope rows
  const { data: scopeRows } = await svc
    .from("admin_scopes")
    .select("id, member_id, chapter_id, granted_at, granted_by")
    .eq("member_id", me.id);

  const scopes: AdminScope[] = scopeRows ?? [];

  // State-wide power: super_admin always, OR any admin with a NULL-chapter scope row.
  const hasStateScope =
    isSuper || scopes.some((s) => s.chapter_id === null);

  // Load chapters this admin can see
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
      // Admin with no scopes at all — treat as state-wide view but they'll only
      // be able to see scoped chapters. For MVP, bounce them home.
      redirect("/");
    }
    chaptersQuery = chaptersQuery.in("id", allowedIds);
  }

  const { data: availableChapters } = await chaptersQuery;

  // Read the active-chapter cookie
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

  // Default when no cookie: if admin has multiple chapters, prefer "all" for
  // state-wide admins, otherwise pick the first chapter.
  if (!activeChapterId && cookieVal !== ACTIVE_CHAPTER_ALL) {
    if (!hasStateScope && (availableChapters?.length ?? 0) >= 1) {
      const first = availableChapters![0]!;
      activeChapterId = first.id;
      activeChapter = first as Chapter;
    }
  }

  return {
    me,
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

/**
 * Check whether the caller is allowed to act within a given chapter.
 * Used by server actions that mutate chapter-scoped resources.
 */
export function canActInChapter(ctx: AdminContext, chapterId: string): boolean {
  if (ctx.isSuper) return true;
  if (ctx.scopes.some((s) => s.chapter_id === null)) return true; // state-wide
  return ctx.scopes.some((s) => s.chapter_id === chapterId);
}
