/**
 * Site locks — super_admin can freeze admin mutations at three granularities:
 *
 *   • global lock                       → blocks every category, every chapter
 *   • category lock                     → blocks one category across all chapters
 *   • category + chapter lock           → blocks one category for one chapter
 *   • category + chapter + resource_id  → blocks one specific record
 *
 * The check honours cascade — a global lock implies category locks imply
 * chapter locks imply row locks. Wire it into mutating server actions via
 * `assertNotLocked({ category, chapterId, resourceId })` BEFORE the write.
 */

import { createServiceClient } from "@/lib/supabase/server";
import { isSuperAdmin, type AuthedMember } from "@/lib/auth";

export type LockCategory =
  | "members"
  | "committee"
  | "agendas"
  | "lab_tests"
  | "bookings"
  | "news"
  | "events"
  | "office_info"
  | "chapters"
  | "membership_requests"
  | "site_settings"
  | "admin_scopes";

export const LOCK_CATEGORIES: { value: LockCategory; label: string }[] = [
  { value: "members",             label: "Members"             },
  { value: "committee",           label: "Committee"           },
  { value: "agendas",             label: "Agendas"             },
  { value: "lab_tests",           label: "Lab tests catalogue" },
  { value: "bookings",            label: "Bookings"            },
  { value: "news",                label: "News"                },
  { value: "events",              label: "Events"              },
  { value: "office_info",         label: "Office info"         },
  { value: "chapters",            label: "Chapters"            },
  { value: "membership_requests", label: "Membership requests" },
  { value: "site_settings",       label: "Site settings"       },
  { value: "admin_scopes",        label: "Admin scopes"        },
];

export type SiteLock = {
  id: string;
  scope: "global" | "category" | "row";
  category: LockCategory | null;
  chapter_id: string | null;
  resource_id: string | null;
  reason: string | null;
  locked_by: string | null;
  locked_at: string;
  unlocked_at: string | null;
  active: boolean;
};

/**
 * Look up active locks affecting a target. Returns the most-specific
 * blocking lock if any (so admins can see exactly which lock to ask about),
 * otherwise null.
 */
export async function findBlockingLock(opts: {
  category: LockCategory;
  chapterId?: string | null;
  resourceId?: string | null;
}): Promise<SiteLock | null> {
  const svc = createServiceClient();

  try {
    const { data, error } = await svc
      .from("site_locks")
      .select("*")
      .eq("active", true);
    if (error || !data) return null;

    const locks = data as SiteLock[];

    // Most specific first.
    const exactRow = locks.find(
      (l) =>
        l.scope === "row" &&
        l.category === opts.category &&
        l.chapter_id === (opts.chapterId ?? null) &&
        l.resource_id === (opts.resourceId ?? null),
    );
    if (exactRow) return exactRow;

    const chapterCat = locks.find(
      (l) =>
        l.category === opts.category &&
        l.chapter_id === (opts.chapterId ?? null) &&
        l.scope !== "row",
    );
    if (chapterCat) return chapterCat;

    const categoryAll = locks.find(
      (l) => l.category === opts.category && l.chapter_id === null && l.scope !== "row",
    );
    if (categoryAll) return categoryAll;

    const global = locks.find((l) => l.scope === "global");
    if (global) return global;

    return null;
  } catch {
    return null;
  }
}

/**
 * Throw if a lock blocks the requested mutation. super_admin bypasses
 * everything (they put the lock in place; they can override it). Other
 * admins get a friendly error mentioning the reason if set.
 */
export async function assertNotLocked(
  caller: AuthedMember,
  opts: {
    category: LockCategory;
    chapterId?: string | null;
    resourceId?: string | null;
  },
): Promise<void> {
  if (isSuperAdmin(caller)) return;
  const lock = await findBlockingLock(opts);
  if (!lock) return;
  const reason = lock.reason ? ` Reason: ${lock.reason}` : "";
  throw new Error(
    `This area is locked by a super_admin and cannot be edited right now.${reason}`,
  );
}

/**
 * List active locks (newest first) for the management UI.
 */
export async function listActiveLocks(): Promise<SiteLock[]> {
  const svc = createServiceClient();
  try {
    const { data } = await svc
      .from("site_locks")
      .select("*")
      .eq("active", true)
      .order("locked_at", { ascending: false });
    return (data ?? []) as SiteLock[];
  } catch {
    return [];
  }
}
