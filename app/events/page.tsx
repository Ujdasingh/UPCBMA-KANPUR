import { createServiceClient } from "@/lib/supabase/server";
import { listActiveChapters } from "@/lib/chapter-loader";
import { getAuthedMember } from "@/lib/auth";
import { StateShell } from "@/components/public/state-shell";
import { ChapterPicker } from "@/components/public/chapter-picker";
import { CalendarDays, MapPin } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Events",
  description:
    "UPCBMA events — AGMs, statewide training, plus chapter meets across Uttar Pradesh.",
};

const STATE_SCOPE = "_state";
const ALL_SCOPE = "_all";

export default async function StateEvents({
  searchParams,
}: {
  searchParams: Promise<{ chapter?: string }>;
}) {
  const { chapter: chapterParam } = await searchParams;

  const [chapters, member] = await Promise.all([
    listActiveChapters(),
    getAuthedMember(),
  ]);

  let scope: string = chapterParam ?? "";
  if (!scope && member) {
    const svc = createServiceClient();
    const { data: memberships } = await svc
      .from("chapter_memberships")
      .select("chapter_id, member_since")
      .eq("member_id", member.id)
      .eq("active", true)
      .order("member_since", { ascending: true })
      .limit(1);
    const primary = memberships?.[0]?.chapter_id;
    if (primary) {
      const c = chapters.find((x) => x.id === primary);
      if (c) scope = c.slug;
    }
  }
  if (!scope) scope = STATE_SCOPE;

  const svc = createServiceClient();
  const today = new Date().toISOString().slice(0, 10);

  // Build dynamic where-clause helper based on scope.
  // We deliberately use `.in("chapter_id", [...])` instead of `.or(...)`
  // because PostgREST's OR-with-null-check has been flaky here when the
  // chapter ID is a UUID — `.in()` is simpler and ignores nulls anyway,
  // so we layer null-handling separately in the chapter case.
  const applyScope = <T extends { is: any; or: any; in: any }>(q: T) => {
    if (scope === STATE_SCOPE) return q.is("chapter_id", null);
    if (scope === ALL_SCOPE) return q;
    const c = chapters.find((x) => x.slug === scope);
    if (!c) return q.is("chapter_id", null);
    // Match either this chapter OR rows with no chapter (state-wide).
    return q.or(`chapter_id.eq.${c.id},chapter_id.is.null`);
  };

  const [{ data: upcoming }, { data: past }] = await Promise.all([
    applyScope(
      svc
        .from("events")
        .select("id, title, event_date, location, recurring, description, chapter_id")
        .gte("event_date", today)
        .order("event_date", { ascending: true })
        .limit(40) as any,
    ),
    applyScope(
      svc
        .from("events")
        .select("id, title, event_date, location, recurring, description, chapter_id")
        .lt("event_date", today)
        .order("event_date", { ascending: false })
        .limit(20) as any,
    ),
  ]);

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
        <div className="mx-auto max-w-7xl px-4 py-9 sm:px-6 sm:py-14 lg:px-8">
          <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
                Events
              </div>
              <h1 className="mt-3 !tracking-tight">
                Calendar for {activeName}.
              </h1>
              <p className="mt-3 text-[15px] leading-relaxed text-muted">
                Statewide AGMs, training, and conferences plus local chapter
                meets — pick a filter to narrow.
              </p>
            </div>
            <ChapterPicker
              chapters={pickerChapters as any}
              value={scope}
              basePath="/events"
              label="Filter"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl space-y-14 px-4 py-7 sm:px-6 sm:py-12 lg:px-8">
        <Section kicker="Upcoming" title="Scheduled" events={(upcoming ?? []) as Ev[]} empty="No upcoming events for this filter." />
        {past && past.length > 0 && (
          <Section kicker="Recent" title="Past" events={past as Ev[]} empty="" muted />
        )}
      </section>
    </StateShell>
  );
}

type Ev = {
  id: string;
  title: string;
  event_date: string;
  location: string | null;
  recurring: boolean | null;
  description: string | null;
  chapter_id: string | null;
};

function Section({
  kicker,
  title,
  events,
  empty,
  muted,
}: {
  kicker: string;
  title: string;
  events: Ev[];
  empty: string;
  muted?: boolean;
}) {
  return (
    <section>
      <div className="flex items-baseline justify-between border-b border-border pb-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">{kicker}</div>
          <h2 className="mt-1 !text-xl !tracking-tight">{title}</h2>
        </div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
          {events.length} {events.length === 1 ? "event" : "events"}
        </div>
      </div>

      {events.length === 0 ? (
        empty ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <CalendarDays className="h-7 w-7 text-muted" strokeWidth={1.5} />
            <p className="mt-3 text-sm text-muted">{empty}</p>
          </div>
        ) : null
      ) : (
        <ul className="mt-6 divide-y divide-border">
          {events.map((e) => (
            <li key={e.id} className={"flex gap-6 py-6 " + (muted ? "opacity-75" : "")}>
              <DateTile date={e.event_date} />
              <div className="flex-1">
                <div className="flex flex-wrap items-baseline gap-2">
                  <h3 className="text-base font-semibold text-heading">{e.title}</h3>
                  {e.chapter_id === null && (
                    <span className="rounded-sm border border-border bg-surface px-1.5 py-0.5 text-[11px] font-medium uppercase text-muted">
                      state
                    </span>
                  )}
                  {e.recurring && (
                    <span className="rounded-sm border border-border bg-surface px-1.5 py-0.5 text-[11px] font-medium text-muted">recurring</span>
                  )}
                </div>
                {e.location && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-sm text-muted">
                    <MapPin className="h-3.5 w-3.5" strokeWidth={1.75} />
                    {e.location}
                  </div>
                )}
                {e.description && <p className="mt-2 text-sm leading-relaxed text-muted">{e.description}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function DateTile({ date }: { date: string }) {
  const d = new Date(date + "T00:00:00");
  const month = d.toLocaleString("en-IN", { month: "short" }).toUpperCase();
  const day = String(d.getDate()).padStart(2, "0");
  const year = d.getFullYear();
  return (
    <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-sm border border-border bg-bg leading-none">
      <div className="text-[11px] font-semibold tracking-[0.15em] text-muted">{month}</div>
      <div className="mt-0.5 text-xl font-bold text-heading tabular-nums">{day}</div>
      <div className="mt-0.5 text-[11px] font-medium tracking-[0.1em] text-muted">{year}</div>
    </div>
  );
}
