import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { createServiceClient } from "@/lib/supabase/server";
import { getAdminContext } from "@/lib/auth";
import { AgendasTable } from "./agendas-table";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Agendas — UPCBMA Admin" };

const TABS = [
  { key: "pending",  label: "Pending review", filter: "pending" },
  { key: "approved", label: "Approved",       filter: "approved" },
  { key: "rejected", label: "Rejected",       filter: "rejected" },
  { key: "all",      label: "All",            filter: null      },
] as const;

export default async function AdminAgendasPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string; tab?: string }>;
}) {
  const { error, ok, tab } = await searchParams;
  const activeTab = TABS.find((t) => t.key === tab) ?? TABS[0];
  const ctx = await getAdminContext();
  const svc = createServiceClient();

  let q = svc.from("agendas").select("*").order("created_at", { ascending: false });
  if (ctx.activeChapterId) {
    q = q.or(`chapter_id.eq.${ctx.activeChapterId},chapter_id.is.null`);
  }
  if (activeTab.filter) {
    q = q.eq("approval_status", activeTab.filter);
  }
  const { data: agendas, error: loadErr } = await q;

  // Pending count for the tab badge
  let pendingCountQ = svc
    .from("agendas")
    .select("*", { head: true, count: "exact" })
    .eq("approval_status", "pending");
  if (ctx.activeChapterId) {
    pendingCountQ = pendingCountQ.or(`chapter_id.eq.${ctx.activeChapterId},chapter_id.is.null`);
  }
  const { count: pendingCount } = await pendingCountQ;

  if (loadErr) {
    return (
      <>
        <PageHeader title="Agendas" />
        <p className="text-sm text-danger">
          Failed to load agendas: {loadErr.message}.{" "}
          {/relation .* does not exist/i.test(loadErr.message) && (
            <>The migration hasn&rsquo;t been applied — run <code className="font-mono">migration-agendas.sql</code> in Supabase first.</>
          )}
        </p>
      </>
    );
  }

  // Counts per agenda (updates + comments) — single round-trip each, fine for now.
  const ids = (agendas ?? []).map((a) => a.id);
  let updateCounts = new Map<string, number>();
  let commentCounts = new Map<string, number>();
  if (ids.length) {
    const [{ data: ups }, { data: cms }] = await Promise.all([
      svc.from("agenda_updates").select("agenda_id").in("agenda_id", ids),
      svc.from("agenda_comments").select("agenda_id").in("agenda_id", ids).eq("hidden", false),
    ]);
    (ups ?? []).forEach((u) => updateCounts.set(u.agenda_id, (updateCounts.get(u.agenda_id) ?? 0) + 1));
    (cms ?? []).forEach((c) => commentCounts.set(c.agenda_id, (commentCounts.get(c.agenda_id) ?? 0) + 1));
  }

  const rows = (agendas ?? []).map((a) => ({
    ...a,
    update_count: updateCounts.get(a.id) ?? 0,
    comment_count: commentCounts.get(a.id) ?? 0,
  }));

  return (
    <>
      <PageHeader
        title={
          ctx.activeChapter
            ? `Agendas · ${ctx.activeChapter.name}`
            : "Agendas · All chapters"
        }
        description="Industry issues being tracked. Each agenda has a public timeline of updates and a member comment thread."
      />

      {error && (
        <div className="mb-5 flex gap-3 rounded-sm border border-red-200 bg-red-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" strokeWidth={1.75} />
          <div className="text-sm text-red-900">{error}</div>
        </div>
      )}
      {ok && (
        <div className="mb-5 flex gap-3 rounded-sm border border-emerald-200 bg-emerald-50 p-4">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" strokeWidth={1.75} />
          <div className="text-sm text-emerald-900">{ok}</div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="mb-5 flex flex-wrap gap-1 border-b border-border">
        {TABS.map((t) => {
          const isActive = t.key === activeTab.key;
          return (
            <Link
              key={t.key}
              href={`/admin/agendas${t.key === "pending" ? "" : `?tab=${t.key}`}`}
              className={
                "inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm no-underline transition-colors " +
                (isActive
                  ? "border-heading text-heading font-semibold"
                  : "border-transparent text-text hover:text-heading")
              }
            >
              {t.label}
              {t.key === "pending" && pendingCount != null && pendingCount > 0 && (
                <span className="rounded-full bg-amber-100 px-1.5 text-[10px] font-semibold text-amber-900">
                  {pendingCount}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      <AgendasTable rows={rows as never} />
    </>
  );
}
