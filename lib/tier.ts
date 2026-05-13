/**
 * Tier resolution — turns a member's role + admin_scopes into the
 * four-tier label the UI shows in the avatar dropdown, audit log,
 * and other "who is this person?" surfaces.
 *
 *   Tier 1 · Super Admin           — members.role = 'super_admin'
 *                                    (invisible to everyone except other supers)
 *   Tier 2 · Admin UPCBMA          — admin_scopes with chapter_id IS NULL
 *                                    OR legacy members.role = 'admin'
 *   Tier 3 · Chapter Admin · X     — admin_scopes(chapter_id=X, tier='officer')
 *   Tier 3 · Content Editor · X    — admin_scopes(chapter_id=X, tier='content')
 *   Tier 4 · Member                — everyone else
 *
 * A single person can hold multiple chapter scopes (rare — Joint
 * Secretary swapping with VP1 mid-term, for example). We surface
 * the highest tier they hold and list every chapter they cover.
 */

import { createServiceClient } from "@/lib/supabase/server";

export type TierLevel = 1 | 2 | 3 | 4;

export type TierInfo = {
  /** Numeric tier — useful for comparisons (lower = more powerful). */
  level: TierLevel;
  /** Short label for chips: "Tier 1 · Super", "Tier 3 · Chapter Admin · Kanpur". */
  label: string;
  /** Long-form label: same as label but spelled out for the dropdown. */
  longLabel: string;
  /** All chapter names this person holds a scope in (empty for tier 1/2/4). */
  chapterNames: string[];
  /** True when the person should see "Admin panel" in nav (tier ≤ 3). */
  hasAdminAccess: boolean;
  /** Officer-tier or above in at least one chapter (drives officer-only UI). */
  isOfficer: boolean;
};

export async function resolveTier(memberId: string): Promise<TierInfo> {
  const svc = createServiceClient();
  const [memberRes, scopesRes] = await Promise.all([
    svc.from("members").select("role").eq("id", memberId).maybeSingle(),
    svc
      .from("admin_scopes")
      .select("chapter_id, tier, chapter:chapters(name)")
      .eq("member_id", memberId),
  ]);

  const role = memberRes.data?.role as string | undefined;

  // Tier 1 — Super. Highest priority, beats everything.
  if (role === "super_admin") {
    return {
      level: 1,
      label: "Tier 1 · Super",
      longLabel: "Tier 1 · Super Admin",
      chapterNames: [],
      hasAdminAccess: true,
      isOfficer: true,
    };
  }

  const scopes = (scopesRes.data ?? []) as Array<{
    chapter_id: string | null;
    tier: string | null;
    chapter: { name: string } | null;
  }>;

  // Tier 2 — Admin UPCBMA. State-wide scope (chapter_id IS NULL) or legacy
  // role='admin'. State-wide scope wins regardless of tier column because
  // a state-level grant means "this person speaks for the secretariat".
  const stateWide = scopes.find((s) => s.chapter_id === null);
  if (stateWide || role === "admin") {
    return {
      level: 2,
      label: "Tier 2 · Admin UPCBMA",
      longLabel: "Tier 2 · Admin UPCBMA · state secretariat",
      chapterNames: [],
      hasAdminAccess: true,
      isOfficer: true,
    };
  }

  // Tier 3 — Chapter-scoped. Officer beats content if they hold both
  // somewhere. Chapter names are gathered for display.
  const chapterScopes = scopes.filter((s) => s.chapter_id !== null);
  if (chapterScopes.length > 0) {
    const hasOfficer = chapterScopes.some((s) => s.tier !== "content");
    const chapterNames = chapterScopes
      .map((s) => s.chapter?.name ?? null)
      .filter((n): n is string => !!n);
    const joined =
      chapterNames.length === 0
        ? "chapter"
        : chapterNames.length === 1
          ? chapterNames[0]
          : chapterNames.length === 2
            ? chapterNames.join(" & ")
            : `${chapterNames.slice(0, -1).join(", ")} & ${chapterNames.at(-1)}`;
    if (hasOfficer) {
      return {
        level: 3,
        label: `Tier 3 · Chapter Admin · ${joined}`,
        longLabel: `Tier 3 · Chapter Admin · ${joined}`,
        chapterNames,
        hasAdminAccess: true,
        isOfficer: true,
      };
    }
    return {
      level: 3,
      label: `Tier 3 · Content Editor · ${joined}`,
      longLabel: `Tier 3 · Content Editor · ${joined}`,
      chapterNames,
      hasAdminAccess: true,
      isOfficer: false,
    };
  }

  // Tier 4 — just a member.
  return {
    level: 4,
    label: "Tier 4 · Member",
    longLabel: "Tier 4 · Member",
    chapterNames: [],
    hasAdminAccess: false,
    isOfficer: false,
  };
}
