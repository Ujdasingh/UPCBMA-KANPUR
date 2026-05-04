import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import { listActiveChapters } from "@/lib/chapter-loader";
import { getAuthedMember } from "@/lib/auth";
import { StateShell } from "@/components/public/state-shell";
import { ChapterPicker } from "@/components/public/chapter-picker";
import { Newspaper } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "News",
  description:
    "State and chapter announcements from UPCBMA. Filter by chapter to see local news.",
};

const tagTone: Record<string, string> = {
  ANNOUNCEMENT: "bg-blue-50 text-blue-900 border-blue-200",
  EVENT: "bg-emerald-50 text-emerald-900 border-emerald-200",
  NOTICE: "bg-amber-50 text-amber-900 border-amber-200",
  UPDATE: "bg-surface text-muted border-border",
};

const STATE_SCOPE = "_state";
const ALL_SCOPE = "_all";

/**
 * State-wide /news with a chapter filter.
 *  • ?chapter=<slug>  → that chapter's posts + state-wide posts
 *  • ?chapter=_state  → state-wide only (chapter_id IS NULL)
 *  • ?chapter=_all    → every post across every chapter
 *  • no param         → defaults to the signed-in member's chapter (or _state)
 */
export default async function StateNews({
  searchParams,
}: {
  searchParams: Promise<{ chapter?: string }>;
}) {
  const { chapter: chapterParam } = await searchParams;

  const [chapters, member] = await Promise.all([
    listActiveChapters(),
    getAuthedMember(),
  ]);

  // Default scope is now ALL chapters for everyone — landing on /news
  // from the state homepage should show every chapter's posts side by
  // side, not auto-filter to the signed-in member's chapter.
  void member; // kept in scope for any future per-user customisation
  let scope: string = chapterParam ?? ALL_SCOPE;

  const svc = createServiceClient();
  // Join chapters so each card can carry a chapter name badge instead of
  // an opaque uuid.
  let query = svc
    .from("news")
    .select(
      "id, tag, title, body, image_url, published_date, chapter_id, chapter:chapters(slug, name)",
    )
    .order("published_date", { ascending: false })
    .limit(80);

  let activeChapterName: string | null = null;
  if (scope === STATE_SCOPE) {
    query = query.is("chapter_id", null);
  } else if (scope === ALL_SCOPE) {
    // no filter
  } else {
    const c = chapters.find((x) => x.slug === scope);
    if (c) {
      activeChapterName = c.name;
      query = query.or(`chapter_id.eq.${c.id},chapter_id.is.null`);
    } else {
      // unknown chapter → fall back to state-wide
      query = query.is("chapter_id", null);
      scope = STATE_SCOPE;
    }
  }

  const { data: items } = await query;

  // Build the picker list with synthetic "state-wide" / "all" options.
  const pickerChapters = [
    {
      id: STATE_SCOPE,
      slug: STATE_SCOPE,
      name: "State-wide only",
      city: "UPCBMA secretariat",
      state: "—",
      established_on: null,
      logo_url: null,
      accent_color: null,
      active: true,
      display_order: -1,
    },
    {
      id: ALL_SCOPE,
      slug: ALL_SCOPE,
      name: "All chapters",
      city: "Aggregated",
      state: "—",
      established_on: null,
      logo_url: null,
      accent_color: null,
      active: true,
      display_order: 0,
    },
    ...chapters,
  ];

  return (
    <StateShell>
      <section className="border-b border-border bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-9 sm:px-6 sm:py-14 lg:px-8">
          <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
                News &amp; notices
              </div>
              <h1 className="mt-3 !tracking-tight">
                {scope === STATE_SCOPE
                  ? "Statewide announcements"
                  : scope === ALL_SCOPE
                    ? "All news across UPCBMA"
                    : `News for ${activeChapterName ?? "your chapter"}`}
              </h1>
              <p className="mt-3 text-[15px] leading-relaxed text-muted">
                {scope === STATE_SCOPE
                  ? "Compliance circulars and policy updates from the UPCBMA secretariat."
                  : scope === ALL_SCOPE
                    ? "Aggregated feed of every chapter's posts plus state-wide notices."
                    : "Chapter announcements plus state-wide notices that affect this chapter."}
              </p>
            </div>
            <ChapterPicker
              chapters={pickerChapters as any}
              value={scope}
              basePath="/news"
              label="Filter"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-9 sm:px-6 sm:py-14 lg:px-8">
        {!items || items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Newspaper className="h-8 w-8 text-muted" strokeWidth={1.5} />
            <h2 className="mt-4 !text-xl">No posts in this view.</h2>
            <p className="mt-2 max-w-md text-sm text-muted">
              Try a different chapter filter, or check back soon.
            </p>
          </div>
        ) : (
          <ul className="space-y-4">
            {items.map((n) => {
              const ch = (n as any).chapter as
                | { slug: string; name: string }
                | null;
              const chapterLabel = ch ? ch.name : "State-wide";
              const isStateWide = !ch;
              return (
                <li key={n.id}>
                  <Link
                    href={`/news/${n.id}`}
                    className="group flex gap-4 rounded-sm border border-border bg-bg p-4 no-underline hover:border-heading sm:gap-5 sm:p-5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em]">
                        {/* Chapter / state badge first, colour-coded so the
                            scope is the first thing the eye lands on. */}
                        <span
                          className={
                            "inline-flex items-center rounded-sm border px-1.5 py-0.5 " +
                            (isStateWide
                              ? "border-amber-200 bg-amber-50 text-amber-800"
                              : "border-emerald-200 bg-emerald-50 text-emerald-800")
                          }
                        >
                          {chapterLabel}
                        </span>
                        <span
                          className={
                            "inline-flex items-center rounded-sm border px-1.5 py-0.5 " +
                            (tagTone[n.tag] ?? tagTone.UPDATE)
                          }
                        >
                          {n.tag}
                        </span>
                        <time className="text-muted">
                          {fmt(n.published_date)}
                        </time>
                      </div>
                      <h3 className="text-base font-semibold text-heading group-hover:text-hover">
                        {n.title}
                      </h3>
                      {n.body && (
                        <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-muted">
                          {n.body}
                        </p>
                      )}
                    </div>
                    {/* Cover image on the right — only renders when present.
                        Empty cards stay clean rather than showing a
                        placeholder tile. */}
                    {n.image_url && (
                      <div className="hidden shrink-0 sm:block">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={n.image_url}
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
        )}
      </section>
    </StateShell>
  );
}

function fmt(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
