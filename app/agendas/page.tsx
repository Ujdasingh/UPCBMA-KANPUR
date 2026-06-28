import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import { listActiveChapters } from "@/lib/chapter-loader";
import { getAuthedMember } from "@/lib/auth";
import { StateShell } from "@/components/public/state-shell";
import { ChapterPicker } from "@/components/public/chapter-picker";
import {
  categoryLabel,
  priorityTone,
  statusTone,
  type Agenda,
} from "@/lib/agendas";
import { Megaphone, Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Agendas",
  description:
    "Live tracker of industry issues UPCBMA chapters are working on — gas, paper rates, supply, regulation, and more.",
};

const STATE_SCOPE = "_state";
const ALL_SCOPE = "_all";

export default async function AgendasListPage({
  searchParams,
}: {
  searchParams: Promise<{ chapter?: string }>;
}) {
  const { chapter: chapterParam } = await searchParams;
  const [chapters, member] = await Promise.all([
    listActiveChapters(),
    getAuthedMember(),
  ]);

  // Default scope is now ALL chapters for everyone — landing on /agendas
  // from the state homepage should show what every chapter is working on,
  // not auto-filter to the signed-in member's chapter. Members can switch
  // to their own chapter via the filter dropdown above the list.
  void member; // kept for any future per-user customisation
  let scope: string = chapterParam ?? ALL_SCOPE;

  const svc = createServiceClient();
  let q = svc
    .from("agendas")
    .select("*, chapter:chapters(slug, name)")
    .eq("approval_status", "approved")
    .eq("visibility", "public")
    .order("started_on", { ascending: false });

  if (scope === STATE_SCOPE) {
    q = q.is("chapter_id", null);
  } else if (scope !== ALL_SCOPE) {
    const c = chapters.find((x) => x.slug === scope);
    if (c) {
      q = q.or(`chapter_id.eq.${c.id},chapter_id.is.null`);
    } else {
      q = q.is("chapter_id", null);
      scope = STATE_SCOPE;
    }
  }

  const { data: agendas } = await q;

  // Group by status — Active first, then on_hold, then resolved/archived.
  const byStatus: Record<string, Agenda[]> = {
    active: [],
    on_hold: [],
    resolved: [],
    archived: [],
  };
  (agendas ?? []).forEach((a) => {
    if (!byStatus[a.status]) byStatus[a.status] = [];
    byStatus[a.status]!.push(a as Agenda);
  });

  const activeName =
    scope === STATE_SCOPE
      ? "UPCBMA statewide"
      : scope === ALL_SCOPE
        ? "every chapter"
        : (chapters.find((c) => c.slug === scope)?.name ?? "your chapter");

  const pickerChapters = [
    { id: STATE_SCOPE, slug: STATE_SCOPE, name: "State-wide only", city: "UPCBMA secretariat", state: "—", established_on: null, logo_url: null, accent_color: null, active: true, display_order: -1 },
    { id: ALL_SCOPE, slug: ALL_SCOPE, name: "All chapters", city: "Aggregated", state: "—", established_on: null, logo_url: null, accent_color: null, active: true, display_order: 0 },
    ...chapters,
  ];

  return (
    <StateShell>
      <section className="border-b border-border bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-12 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-2xl">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
                Agendas
              </div>
              <h1 className="mt-3 !tracking-tight">
                What {activeName} is working on.
              </h1>
              <p className="mt-3 max-w-prose text-[15px] leading-relaxed text-muted">
                Industry issues UPCBMA chapters are tracking — meeting the
                right people, sending the right letters, building the case for
                government. Anyone can propose; admins review and publish.
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <ChapterPicker
                chapters={pickerChapters as any}
                value={scope}
                basePath="/agendas"
                label="Filter"
              />
              <Link
                href="/agendas/propose"
                className="inline-flex h-11 items-center gap-1.5 rounded-sm bg-heading px-4 text-sm font-medium text-white no-underline hover:bg-hover"
              >
                <Plus className="h-4 w-4" strokeWidth={2} />
                Propose an agenda
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        {(agendas ?? []).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Megaphone className="h-8 w-8 text-muted" strokeWidth={1.5} />
            <h2 className="mt-4 !text-xl">No agendas in this view.</h2>
            <p className="mt-2 max-w-md text-sm text-muted">
              Be the first to propose one — sign in and click{" "}
              <Link href="/agendas/propose" className="underline">
                Propose an agenda
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {(["active", "on_hold", "resolved", "archived"] as const).map(
              (status) => {
                const list = byStatus[status] ?? [];
                if (list.length === 0) return null;
                return (
                  <div key={status}>
                    <div className="mb-4 flex items-baseline justify-between border-b border-border pb-3">
                      <h2 className="!text-xl !tracking-tight capitalize">
                        {status.replace("_", " ")}
                      </h2>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                        {list.length} {list.length === 1 ? "agenda" : "agendas"}
                      </div>
                    </div>
                    <ul className="space-y-4">
                      {list.map((a) => {
                        const ch = (a as any).chapter as
                          | { slug: string; name: string }
                          | null;
                        const chapterLabel = ch ? ch.name : "State-wide";
                        return (
                          <li key={a.id}>
                            <Link
                              href={`/agendas/${a.slug}`}
                              className="group flex gap-4 rounded-sm border border-border bg-bg p-4 no-underline hover:border-heading sm:gap-5 sm:p-5"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em]">
                                  {/* Chapter / state badge first — most important
                                      on the aggregated default view. */}
                                  <span
                                    className={
                                      "inline-flex items-center rounded-sm border px-1.5 py-0.5 " +
                                      (ch
                                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                        : "border-amber-200 bg-amber-50 text-amber-800")
                                    }
                                  >
                                    {chapterLabel}
                                  </span>
                                  <span className="text-muted">
                                    {categoryLabel(a.category)}
                                  </span>
                                  <span
                                    className={
                                      "inline-flex items-center rounded-sm border px-1.5 py-0.5 " +
                                      statusTone(a.status)
                                    }
                                  >
                                    {a.status.replace("_", " ")}
                                  </span>
                                  <span
                                    className={
                                      "inline-flex items-center rounded-sm border px-1.5 py-0.5 " +
                                      priorityTone(a.priority)
                                    }
                                  >
                                    {a.priority} priority
                                  </span>
                                </div>
                                <h3 className="text-base font-semibold text-heading group-hover:text-hover">
                                  {a.title}
                                </h3>
                                {a.summary && (
                                  <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-muted">
                                    {a.summary}
                                  </p>
                                )}
                                <div className="mt-3 flex items-center gap-3 text-[11px] text-muted">
                                  <span>started {a.started_on}</span>
                                  {a.target_resolution_on && (
                                    <span>target {a.target_resolution_on}</span>
                                  )}
                                </div>
                              </div>
                              {/* Image on the right — only renders when the
                                  agenda has a cover. Empty cards stay clean
                                  rather than showing a placeholder tile. */}
                              {a.image_url && (
                                <div className="hidden shrink-0 sm:block">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={a.image_url}
                                    alt=""
                                    className="h-24 w-32 rounded-sm border border-border object-cover sm:h-28 sm:w-40 md:h-32 md:w-44"
                                  />
                                </div>
                              )}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              },
            )}
          </div>
        )}
      </section>
    </StateShell>
  );
}
