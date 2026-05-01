import Link from "next/link";
import { Lock, ShieldAlert } from "lucide-react";
import { listActiveLocks, LOCK_CATEGORIES, type SiteLock } from "@/lib/locks";
import type { Chapter } from "@/lib/chapters";

/**
 * Banner shown at the top of every admin page when active site_locks affect
 * the admin's current chapter scope.
 *
 * Visibility rules:
 *   • Global lock          → always shown.
 *   • Category lock (any chapter) when no chapter is selected.
 *   • Category + chapter lock matching the active chapter.
 *   • Row-scope locks → not surfaced here (too noisy for a banner; the
 *     individual action shows the friendly error in-flow).
 *
 * Super_admin sees the same banner because they're often the lock author and
 * want a reminder; the only difference is they bypass enforcement.
 */
export async function LockBanner({
  isSuper,
  activeChapter,
}: {
  isSuper: boolean;
  activeChapter: Chapter | null;
}) {
  let locks: SiteLock[] = [];
  try {
    locks = await listActiveLocks();
  } catch {
    return null;
  }
  if (locks.length === 0) return null;

  // Filter to locks that the current admin's view should know about.
  const relevant = locks.filter((l) => {
    if (l.scope === "row") return false;
    if (l.scope === "global") return true;
    // category scope:
    if (l.chapter_id == null) return true; // category-wide
    return activeChapter?.id === l.chapter_id;
  });
  if (relevant.length === 0) return null;

  // Group by category for readable summary
  const byCat = new Map<string, SiteLock[]>();
  for (const l of relevant) {
    const k = l.scope === "global" ? "_global" : (l.category ?? "(uncategorised)");
    if (!byCat.has(k)) byCat.set(k, []);
    byCat.get(k)!.push(l);
  }

  return (
    <div className="border-b border-amber-300 bg-amber-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-8 py-3 text-xs md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-2 text-amber-900">
          <ShieldAlert
            className="mt-0.5 h-4 w-4 shrink-0"
            strokeWidth={2}
            aria-hidden="true"
          />
          <div className="space-y-1">
            <div className="font-semibold">
              {relevant.length === 1
                ? "1 active lock"
                : `${relevant.length} active locks`}{" "}
              affecting this view.
              {isSuper ? (
                <span className="ml-1 font-normal text-amber-800">
                  You bypass these.
                </span>
              ) : (
                <span className="ml-1 font-normal text-amber-800">
                  Some mutations will be blocked.
                </span>
              )}
            </div>
            <ul className="flex flex-wrap items-center gap-x-3 gap-y-1 text-amber-900/90">
              {Array.from(byCat.entries()).map(([cat, list]) => {
                const label =
                  cat === "_global"
                    ? "Everything"
                    : LOCK_CATEGORIES.find((c) => c.value === cat)?.label ?? cat;
                const reason = list.find((l) => l.reason)?.reason;
                return (
                  <li key={cat} className="inline-flex items-center gap-1">
                    <Lock className="h-3 w-3" strokeWidth={2} />
                    <span className="font-medium">{label}</span>
                    {reason && (
                      <span className="text-amber-800">— {reason}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
        {isSuper && (
          <Link
            href="/admin/super/locks"
            className="inline-flex shrink-0 items-center gap-1 self-start rounded-sm border border-amber-400 bg-white px-2 py-1 text-xs font-medium text-amber-900 no-underline hover:bg-amber-100"
          >
            Manage locks →
          </Link>
        )}
      </div>
    </div>
  );
}
