import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { getChapterBySlug, RESERVED_SLUGS } from "@/lib/chapter-loader";
import { ChapterShell } from "@/components/public/chapter-shell";
import { Newspaper } from "lucide-react";

export const revalidate = 60;

const tagTone: Record<string, string> = {
  ANNOUNCEMENT: "bg-blue-50 text-blue-900 border-blue-200",
  EVENT: "bg-emerald-50 text-emerald-900 border-emerald-200",
  NOTICE: "bg-amber-50 text-amber-900 border-amber-200",
  UPDATE: "bg-surface text-muted border-border",
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (RESERVED_SLUGS.has(slug)) return {};
  const chapter = await getChapterBySlug(slug);
  return chapter ? { title: `News — ${chapter.name}` } : {};
}

export default async function ChapterNews({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (RESERVED_SLUGS.has(slug)) notFound();
  const chapter = await getChapterBySlug(slug);
  if (!chapter) notFound();

  const svc = createServiceClient();
  const { data: items } = await svc
    .from("news")
    .select("id, tag, title, body, published_date, chapter_id")
    .or(`chapter_id.eq.${chapter.id},chapter_id.is.null`)
    .order("published_date", { ascending: false });

  return (
    <ChapterShell chapter={chapter}>
      <section className="border-b border-border bg-surface">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">News</div>
          <h1 className="mt-3 !tracking-tight">Notices &amp; announcements.</h1>
          <p className="mt-4 text-[15px] leading-relaxed text-muted">
            Chapter announcements for {chapter.city} plus state-wide updates from UPCBMA.
          </p>
        </div>
      </section>
      <section className="mx-auto max-w-3xl px-6 py-12">
        {!items || items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Newspaper className="h-8 w-8 text-muted" strokeWidth={1.5} />
            <h2 className="mt-4 !text-xl">No posts yet.</h2>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((n) => (
              <li key={n.id} className="py-6">
                <Link href={`/${chapter.slug}/news/${n.id}`} className="group block no-underline">
                  <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.18em]">
                    <span className={"inline-flex items-center rounded-sm border px-1.5 py-0.5 " + (tagTone[n.tag] ?? tagTone.UPDATE)}>
                      {n.tag}
                    </span>
                    <time className="text-muted">{fmt(n.published_date)}</time>
                    {n.chapter_id === null && (
                      <span className="rounded-sm border border-border bg-surface px-1.5 py-0.5 text-[9px] text-muted">
                        state
                      </span>
                    )}
                  </div>
                  <h2 className="mt-2 !text-lg font-semibold text-heading group-hover:text-hover">{n.title}</h2>
                  {n.body && <p className="mt-1.5 line-clamp-2 text-sm text-muted">{n.body}</p>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </ChapterShell>
  );
}

function fmt(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
