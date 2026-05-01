import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { StateShell } from "@/components/public/state-shell";
import { ArrowLeft } from "lucide-react";

export const revalidate = 60;

const tagTone: Record<string, string> = {
  ANNOUNCEMENT: "bg-blue-50 text-blue-900 border-blue-200",
  EVENT: "bg-emerald-50 text-emerald-900 border-emerald-200",
  NOTICE: "bg-amber-50 text-amber-900 border-amber-200",
  UPDATE: "bg-surface text-muted border-border",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const svc = createServiceClient();
  const { data } = await svc
    .from("news")
    .select("title,body,image_url")
    .eq("id", id)
    .maybeSingle();
  if (!data) return { title: "News — UPCBMA" };
  return {
    title: `${data.title} — UPCBMA`,
    description: (data.body ?? "").slice(0, 160),
    openGraph: data.image_url ? { images: [data.image_url] } : undefined,
  };
}

/**
 * Unified news detail. Shows BOTH state-wide and chapter-scoped posts —
 * chapter consolidation means there's no separate /<chapter>/news/<id> page.
 * The "back" link leads to /news with the appropriate filter pre-applied.
 */
export default async function NewsDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const svc = createServiceClient();

  const { data: item } = await svc
    .from("news")
    .select("id, tag, title, body, image_url, published_date, chapter_id")
    .eq("id", id)
    .maybeSingle();
  if (!item) notFound();

  // Resolve chapter for label + back-link if scoped.
  let chapterLabel: { name: string; slug: string } | null = null;
  if (item.chapter_id) {
    const { data: c } = await svc
      .from("chapters")
      .select("name, slug")
      .eq("id", item.chapter_id)
      .maybeSingle();
    chapterLabel = c ?? null;
  }

  const backHref = chapterLabel
    ? `/news?chapter=${chapterLabel.slug}`
    : "/news";
  const backLabel = chapterLabel
    ? `${chapterLabel.name} news`
    : "All state news";

  return (
    <StateShell>
      <article className="mx-auto max-w-3xl px-4 py-9 sm:px-6 sm:py-14">
        <Link
          href={backHref}
          className="inline-flex items-center text-xs font-medium text-muted no-underline hover:text-heading"
        >
          <ArrowLeft className="mr-1 h-3.5 w-3.5" strokeWidth={2} />
          {backLabel}
        </Link>

        <div className="mt-6 flex flex-wrap items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.18em]">
          <span
            className={
              "inline-flex items-center rounded-sm border px-1.5 py-0.5 " +
              (tagTone[item.tag] ?? tagTone.UPDATE)
            }
          >
            {item.tag}
          </span>
          <time className="text-muted">
            {new Date(item.published_date + "T00:00:00").toLocaleDateString(
              "en-IN",
              { day: "numeric", month: "long", year: "numeric" },
            )}
          </time>
          {chapterLabel ? (
            <span className="rounded-sm border border-border bg-surface px-1.5 py-0.5 text-muted">
              {chapterLabel.name}
            </span>
          ) : (
            <span className="rounded-sm border border-border bg-surface px-1.5 py-0.5 text-muted">
              State-wide
            </span>
          )}
        </div>

        <h1 className="mt-3 !tracking-tight">{item.title}</h1>

        {item.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image_url}
            alt=""
            className="mt-8 aspect-[16/9] w-full rounded-sm border border-border bg-surface object-cover"
          />
        )}

        {item.body && (
          <div className="prose prose-sm mt-8 max-w-none whitespace-pre-wrap text-[15px] leading-relaxed text-text">
            {item.body}
          </div>
        )}
      </article>
    </StateShell>
  );
}
