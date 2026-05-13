import { redirect } from "next/navigation";
import { PageHeader } from "@/components/admin/page-header";
import { Card } from "@/components/ui/card";
import { createServiceClient } from "@/lib/supabase/server";
import { getAdminContext } from "@/lib/auth";
import { resolveTier } from "@/lib/tier";
import { ScrollText } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Audit log" };

/**
 * Chapter-scoped audit log. Shows who changed what in the chapters this
 * admin has access to:
 *  • Tier 1 (super_admin) and Tier 2 (Admin UPCBMA): every row.
 *  • Tier 3 (Chapter Admin): only rows whose chapter_id matches a
 *    chapter they hold a scope in.
 *  • Tier 4: redirected (no access — they don't see /admin/audit at all).
 *
 * The super-only page at /admin/super/audit still exists for
 * impersonation/site-settings rows that aren't tied to a chapter.
 */
export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ chapter?: string }>;
}) {
  const ctx = await getAdminContext();
  const tier = await resolveTier(ctx.me.id);
  if (tier.level === 4) redirect("/admin");

  const { chapter: chapterParam } = await searchParams;

  const svc = createServiceClient();
  let q = svc
    .from("admin_audit_log")
    .select(
      "id, actor_id, acting_as_id, action, target_table, target_id, chapter_id, diff, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  // Scope. Tier 1/2 see everything by default; Tier 3 is filtered to their
  // chapter(s). The ?chapter= query param narrows further for any tier.
  const myChapterIds = ctx.scopes
    .filter((s) => s.chapter_id !== null)
    .map((s) => s.chapter_id as string);

  if (tier.level === 3) {
    if (myChapterIds.length === 0) redirect("/admin");
    q = q.in("chapter_id", myChapterIds);
  }

  if (chapterParam) {
    const ch = ctx.availableChapters.find((c) => c.slug === chapterParam);
    if (ch) {
      q = q.eq("chapter_id", ch.id);
    }
  }

  const { data: rawRows } = await q;

  // Resolve actor + acting_as names AND roles so we can hide super_admin
  // actors from Tier 2/3 timelines — the super account is invisible by
  // design (see lib/super-shim.ts).
  const memberIds = new Set<string>();
  (rawRows ?? []).forEach((r) => {
    if (r.actor_id) memberIds.add(r.actor_id);
    if (r.acting_as_id) memberIds.add(r.acting_as_id);
  });
  const { data: people } = await svc
    .from("members")
    .select("id, name, role")
    .in("id", memberIds.size ? Array.from(memberIds) : ["__none__"]);
  const nameById = new Map<string, string>();
  const roleById = new Map<string, string>();
  (people ?? []).forEach((p) => {
    nameById.set(p.id, p.name);
    if (p.role) roleById.set(p.id, p.role);
  });

  // Strip rows whose actor (or impersonation target) is a super_admin
  // unless the viewer is super themselves. That keeps super-admin
  // existence hidden — both the name and the fact that something
  // happened — at the cost of small visible gaps in the timeline.
  const rows = (rawRows ?? []).filter((r) => {
    if (tier.level === 1) return true;
    if (r.actor_id && roleById.get(r.actor_id) === "super_admin") return false;
    if (r.acting_as_id && roleById.get(r.acting_as_id) === "super_admin")
      return false;
    return true;
  });

  // Resolve chapter names for the chapter_id column.
  const chapterIdsToResolve = new Set<string>();
  (rows ?? []).forEach((r) => {
    if (r.chapter_id) chapterIdsToResolve.add(r.chapter_id);
  });
  const { data: chapters } = await svc
    .from("chapters")
    .select("id, name")
    .in(
      "id",
      chapterIdsToResolve.size ? Array.from(chapterIdsToResolve) : ["__none__"],
    );
  const chapterNameById = new Map<string, string>();
  (chapters ?? []).forEach((c) => chapterNameById.set(c.id, c.name));

  return (
    <>
      <PageHeader
        title="Audit log"
        description={
          tier.level === 3
            ? `Recent activity in ${tier.chapterNames.join(", ") || "your chapter"}. Last 200 entries.`
            : "Recent activity across UPCBMA. Last 200 entries."
        }
      />

      {!rows || rows.length === 0 ? (
        <Card>
          <div className="flex gap-3">
            <ScrollText
              className="mt-0.5 h-5 w-5 shrink-0 text-muted"
              strokeWidth={1.75}
            />
            <div className="text-sm text-text">
              No audit rows yet. Committee swaps, member changes, and lock
              toggles will appear here as they happen.
            </div>
          </div>
        </Card>
      ) : (
        <Card>
          <ul className="divide-y divide-border">
            {rows.map((r) => {
              const actorName =
                nameById.get(r.actor_id ?? "") ?? r.actor_id ?? "(unknown)";
              const chName = r.chapter_id
                ? (chapterNameById.get(r.chapter_id) ?? "Chapter")
                : "State-wide";
              return (
                <li
                  key={r.id}
                  className="flex items-start justify-between gap-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="font-mono text-xs text-muted">
                      {new Date(r.created_at)
                        .toISOString()
                        .replace("T", " ")
                        .slice(0, 19)}
                    </div>
                    <div className="mt-0.5 text-sm">
                      <span className="font-medium text-heading">
                        {actorName}
                      </span>{" "}
                      <span className="text-muted">
                        {r.action.replace(/_/g, " ")}
                      </span>
                      {r.acting_as_id && (
                        <>
                          {" "}
                          <span className="text-muted">as</span>{" "}
                          <span className="font-medium text-heading">
                            {nameById.get(r.acting_as_id) ?? r.acting_as_id}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
                      <span
                        className={
                          "inline-flex items-center rounded-sm border px-1.5 py-0.5 font-semibold uppercase tracking-[0.14em] " +
                          (r.chapter_id
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                            : "border-amber-200 bg-amber-50 text-amber-800")
                        }
                      >
                        {chName}
                      </span>
                      {r.target_table && (
                        <span className="text-muted">
                          target: <code className="font-mono">{r.target_table}</code>
                          {r.target_id && (
                            <>
                              {" "}
                              · <code className="font-mono">{r.target_id}</code>
                            </>
                          )}
                        </span>
                      )}
                    </div>
                    {r.diff && (
                      <pre className="mt-1 max-w-full overflow-x-auto rounded-sm bg-surface p-2 text-[11px] text-muted">
                        {JSON.stringify(r.diff, null, 2)}
                      </pre>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </>
  );
}
