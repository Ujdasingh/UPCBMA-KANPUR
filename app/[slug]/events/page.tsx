import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { getChapterBySlug, RESERVED_SLUGS } from "@/lib/chapter-loader";
import { ChapterShell } from "@/components/public/chapter-shell";
import { CalendarDays, MapPin } from "lucide-react";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (RESERVED_SLUGS.has(slug)) return {};
  const chapter = await getChapterBySlug(slug);
  return chapter ? { title: `Events — ${chapter.name}` } : {};
}

export default async function ChapterEvents({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (RESERVED_SLUGS.has(slug)) notFound();
  const chapter = await getChapterBySlug(slug);
  if (!chapter) notFound();

  const svc = createServiceClient();
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: upcoming }, { data: past }] = await Promise.all([
    svc
      .from("events")
      .select("id, title, event_date, location, recurring, description, chapter_id")
      .or(`chapter_id.eq.${chapter.id},chapter_id.is.null`)
      .gte("event_date", today)
      .order("event_date", { ascending: true }),
    svc
      .from("events")
      .select("id, title, event_date, location, recurring, description, chapter_id")
      .or(`chapter_id.eq.${chapter.id},chapter_id.is.null`)
      .lt("event_date", today)
      .order("event_date", { ascending: false })
      .limit(12),
  ]);

  return (
    <ChapterShell chapter={chapter}>
      <section className="border-b border-border bg-surface">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">Events</div>
          <h1 className="mt-3 !tracking-tight">Meets &amp; training.</h1>
          <p className="mt-4 text-[15px] leading-relaxed text-muted">
            Chapter meets, workshops, and state-wide fixtures open to {chapter.city} members.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-12 space-y-14">
        <Section kicker="Upcoming" title="Scheduled events" events={upcoming ?? []} empty="No events on the calendar right now." />
        {past && past.length > 0 && (
          <Section kicker="Recent" title="Past events" events={past} empty="" muted />
        )}
      </section>
    </ChapterShell>
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
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">{kicker}</div>
          <h2 className="mt-1 !text-xl !tracking-tight">{title}</h2>
        </div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
          {events.length} {events.length === 1 ? "event" : "events"}
        </div>
      </div>

      {events.length === 0 ? (
        empty ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <CalendarDays className="h-7 w-7 text-muted" strokeWidth={1.5} />
            <p className="mt-3 max-w-md text-sm text-muted">{empty}</p>
          </div>
        ) : null
      ) : (
        <ul className="mt-6 divide-y divide-border">
          {events.map((e) => (
            <li key={e.id} className={"flex gap-6 py-6 " + (muted ? "opacity-75" : "")}>
              <DateTile date={e.event_date} dim={muted} />
              <div className="flex-1">
                <div className="flex flex-wrap items-baseline gap-2">
                  <h3 className="text-base font-semibold text-heading">{e.title}</h3>
                  {e.chapter_id === null && (
                    <span className="rounded-sm border border-border bg-surface px-1.5 py-0.5 text-[9px] font-medium uppercase text-muted">
                      state
                    </span>
                  )}
                  {e.recurring && (
                    <span className="rounded-sm border border-border bg-surface px-1.5 py-0.5 text-[10px] font-medium text-muted">
                      recurring
                    </span>
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

function DateTile({ date, dim }: { date: string; dim?: boolean }) {
  const d = new Date(date + "T00:00:00");
  const month = d.toLocaleString("en-IN", { month: "short" }).toUpperCase();
  const day = String(d.getDate()).padStart(2, "0");
  const year = d.getFullYear();
  return (
    <div className={"flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-sm border leading-none " + (dim ? "border-border bg-surface text-muted" : "border-border bg-bg")}>
      <div className="text-[10px] font-semibold tracking-[0.15em] text-muted">{month}</div>
      <div className="mt-0.5 text-xl font-bold text-heading tabular-nums">{day}</div>
      <div className="mt-0.5 text-[9px] font-medium tracking-[0.1em] text-muted">{year}</div>
    </div>
  );
}
