import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { getChapterBySlug, RESERVED_SLUGS } from "@/lib/chapter-loader";
import { ChapterShell } from "@/components/public/chapter-shell";
import { FlaskConical, ArrowRight, Timer, IndianRupee } from "lucide-react";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (RESERVED_SLUGS.has(slug)) return {};
  const chapter = await getChapterBySlug(slug);
  return chapter ? { title: `Lab services — ${chapter.name}` } : {};
}

export default async function ChapterLab({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (RESERVED_SLUGS.has(slug)) notFound();
  const chapter = await getChapterBySlug(slug);
  if (!chapter) notFound();

  const svc = createServiceClient();

  const [{ data: tests }, { data: office }] = await Promise.all([
    svc
      .from("lab_tests_catalog")
      .select("code, name, description, price_inr, turnaround_days, category, sort_order")
      .eq("chapter_id", chapter.id)
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .order("code", { ascending: true }),
    svc.from("office_info").select("*").eq("chapter_id", chapter.id).maybeSingle(),
  ]);

  const groups: Record<string, NonNullable<typeof tests>> = {};
  for (const t of tests ?? []) {
    const key = t.category ?? "Other";
    if (!groups[key]) groups[key] = [];
    groups[key]!.push(t);
  }
  const categoryKeys = Object.keys(groups).sort();

  return (
    <ChapterShell chapter={chapter}>
      <section className="border-b border-border bg-surface">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">Lab services</div>
          <h1 className="mt-3 !tracking-tight">
            {chapter.city}&rsquo;s in-house testing lab.
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-muted">
            Standard corrugated board and paper tests at member rates.
            Bookings online, sample drop at the lab desk during hours.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={`/${chapter.slug}/lab/book`}
              className="inline-flex h-11 items-center rounded-sm bg-heading px-5 text-sm font-medium text-white no-underline hover:bg-hover"
            >
              Book a test
              <ArrowRight className="ml-2 h-4 w-4" strokeWidth={2} />
            </Link>
            {office?.lab_phone && (
              <a
                href={`tel:${office.lab_phone}`}
                className="inline-flex h-11 items-center rounded-sm border border-rule bg-bg px-5 text-sm font-medium text-heading no-underline hover:border-heading hover:bg-surface"
              >
                Call lab desk: {office.lab_phone}
              </a>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        {categoryKeys.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <FlaskConical className="h-8 w-8 text-muted" strokeWidth={1.5} />
            <h2 className="mt-4 !text-xl">Test catalogue coming soon.</h2>
            <p className="mt-2 max-w-md text-sm text-muted">
              The lab&rsquo;s active test list will be published here. Contact
              the lab desk for current availability.
            </p>
          </div>
        ) : (
          <div className="space-y-16">
            {categoryKeys.map((cat) => {
              const list = groups[cat]!;
              return (
                <div key={cat}>
                  <div className="flex items-baseline justify-between border-b border-border pb-3">
                    <h2 className="!text-xl !tracking-tight">{cat}</h2>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                      {list.length} {list.length === 1 ? "test" : "tests"}
                    </div>
                  </div>
                  <div className="mt-6 divide-y divide-border">
                    {list.map((t) => (
                      <div key={t.code} className="flex flex-col gap-2 py-5 md:flex-row md:items-start md:justify-between md:gap-8">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                            <code className="rounded-sm border border-border bg-surface px-1.5 py-0.5 font-mono text-[11px] text-muted">
                              {t.code}
                            </code>
                            <h3 className="text-base font-semibold text-heading">{t.name}</h3>
                          </div>
                          {t.description && <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-muted">{t.description}</p>}
                        </div>
                        <div className="flex shrink-0 gap-8 md:justify-end">
                          <Meta Icon={IndianRupee} label="Member rate" value={t.price_inr != null ? t.price_inr.toLocaleString("en-IN") : "On request"} />
                          <Meta Icon={Timer} label="TAT" value={t.turnaround_days != null ? `${t.turnaround_days} d` : "On request"} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </ChapterShell>
  );
}

function Meta({
  Icon,
  label,
  value,
}: {
  Icon: typeof Timer;
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
        <Icon className="h-3 w-3" strokeWidth={1.75} />
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-heading tabular-nums">{value}</div>
    </div>
  );
}
