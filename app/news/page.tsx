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

  // Resolve effective scope. Anonymous + no param → state-wide only.
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
  let query = svc
    .from("news")
    .select("id, tag, title, body, image_url, published_date, chapter_id")
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

      <section className="mx-auto max-w-7xl px-4 py-9 sm:px-6 sm:py-14 lg:px-8">
        {!items || items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Newspaper className="h-8 w-8 text-muted" strokeWidth={1.5} />
            <h2 className="mt-4 !text-xl">No posts in this view.</h2>
            <p className="mt-2 max-w-md text-sm text-muted">
              Try a different chapter filter, or check back soon.
            </p>
          </div>
        ) : (
          <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {items.map((n) => (
              <li key={n.id}>
                <Link
                  href={`/news/${n.id}`}
                  className="group block overflow-hidden rounded-sm border border-border bg-bg no-underline hover:border-heading"
                >
                  {n.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={n.image_url}
                      alt=""
                      className="aspect-[16/9] w-full object-cover"
                    />
                  ) : (
                    <div className="flex aspect-[16/9] w-full items-center justify-center bg-surface text-muted">
                      <Newspaper className="h-8 w-8" strokeWidth={1.25} />
                    </div>
                  )}
                  <div className="p-5">
                    <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em]">
                      <span
                        className={
                          "inline-flex items-center rounded-sm border px-1.5 py-0.5 " +
                          (tagTone[n.tag] ?? tagTone.UPDATE)
                        }
                      >
                        {n.tag}
                      </span>
                      <time className="text-muted">{fmt(n.published_date)}</time>
                      {n.chapter_id === null && (
                        <span className="rounded-sm border border-border bg-surface px-1.5 py-0.5 text-[9px] text-muted">
                          state
                        </span>
                      )}
                    </div>
                    <h3 className="mt-2 text-base font-semibold text-heading group-hover:text-hover">
                      {n.title}
                    </h3>
                    {n.body && (
                      <p className="mt-1.5 line-clamp-3 text-sm text-muted">
                        {n.body}
                      </p>
                    )}
                  </div>
                </Link>
              </li>
            ))}
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
