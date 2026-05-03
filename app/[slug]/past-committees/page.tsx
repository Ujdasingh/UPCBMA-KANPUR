import { notFound } from "next/navigation";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import { getChapterBySlug, RESERVED_SLUGS } from "@/lib/chapter-loader";
import { ChapterShell } from "@/components/public/chapter-shell";
import { Avatar } from "@/components/public/avatar";
import { RichBody } from "@/components/public/rich-body";
import { ArrowLeft } from "lucide-react";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (RESERVED_SLUGS.has(slug)) return {};
  const chapter = await getChapterBySlug(slug);
  if (!chapter) return { title: "Past committees" };
  return {
    title: `Past committees — ${chapter.name}`,
    description: `A record of every past Managing Committee of ${chapter.name}, with their achievements.`,
  };
}

type PastTerm = {
  id: string;
  fy_label: string;
  starts_on: string;
  ends_on: string;
  president_name: string;
  president_photo_url: string | null;
  achievements: string | null;
  display_order: number;
};

export default async function PastCommitteesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (RESERVED_SLUGS.has(slug)) notFound();
  const chapter = await getChapterBySlug(slug);
  if (!chapter) notFound();

  const svc = createServiceClient();
  const { data } = await svc
    .from("past_committee_terms")
    .select(
      "id, fy_label, starts_on, ends_on, president_name, president_photo_url, achievements, display_order",
    )
    .eq("chapter_id", chapter.id)
    .order("ends_on", { ascending: false })
    .order("display_order", { ascending: true });

  const terms = (data ?? []) as PastTerm[];

  return (
    <ChapterShell chapter={chapter}>
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <Link
          href={`/${chapter.slug}`}
          className="inline-flex items-center text-xs font-medium text-muted no-underline hover:text-heading"
        >
          <ArrowLeft className="mr-1 h-3.5 w-3.5" strokeWidth={2} />
          Back to {chapter.name}
        </Link>

        <header className="mt-6 border-b border-border pb-6">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
            {chapter.state} · {chapter.name}
          </div>
          <h1 className="mt-2 !tracking-tight">Past presidents &amp; committees</h1>
          <p className="mt-3 max-w-prose text-[15px] leading-relaxed text-muted">
            A running record of the chapter&rsquo;s leadership year by year.
          </p>
        </header>

        {terms.length === 0 ? (
          // Intentionally minimal. No template, no "to be added" filler —
          // an empty page reads as "we haven't written this yet" rather
          // than "the chapter has no history."
          <p className="mt-12 text-sm text-muted">
            Past terms will appear here as the secretariat fills them in.
          </p>
        ) : (
          <ol className="mt-10 space-y-12">
            {terms.map((t) => (
              <PastTermBlock key={t.id} term={t} />
            ))}
          </ol>
        )}
      </main>
    </ChapterShell>
  );
}

function PastTermBlock({ term }: { term: PastTerm }) {
  const startYear = new Date(term.starts_on).getFullYear();
  const endYear = new Date(term.ends_on).getFullYear();
  const yearLabel =
    term.fy_label || (startYear === endYear ? `${startYear}` : `${startYear}–${endYear}`);
  const hasAchievements = !!term.achievements && term.achievements.trim().length > 0;

  return (
    <li>
      <div className="flex items-start gap-4">
        {/* Avatar only when a photo exists; otherwise we skip it entirely
            (initials fallback would look like a placeholder). */}
        {term.president_photo_url ? (
          <Avatar
            name={term.president_name}
            src={term.president_photo_url}
            size="lg"
          />
        ) : (
          <div className="hidden sm:block h-12 w-12" />
        )}
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
            {yearLabel}
          </div>
          <h2 className="mt-1 !text-xl !tracking-tight">
            {term.president_name}
          </h2>
        </div>
      </div>

      {/* Achievements render only when text exists — no template,
          no "Achievements coming soon" placeholder. */}
      {hasAchievements && (
        <div className="mt-4 sm:ml-16">
          <RichBody source={term.achievements!} />
        </div>
      )}
    </li>
  );
}
