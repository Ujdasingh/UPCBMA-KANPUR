import Link from "next/link";
import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { listActiveChapters } from "@/lib/chapter-loader";
import { getAuthedMember } from "@/lib/auth";
import { StateShell } from "@/components/public/state-shell";
import { ChapterPicker } from "@/components/public/chapter-picker";
import {
  FlaskConical,
  ArrowRight,
  Timer,
  IndianRupee,
  Phone,
  MapPin,
} from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Lab services — UPCBMA",
  description:
    "Browse each chapter's testing lab — burst, compression, Cobb, GSM, and more. Book at member rates.",
};

/**
 * State-level lab page. Shows a chapter dropdown that defaults to the
 * signed-in member's chapter; the catalogue rendered is for the chosen one.
 *
 * The choice is made via ?chapter=<slug>. Anonymous browsers see a sensible
 * default (first active chapter) but can switch.
 */
export default async function StateLabPage({
  searchParams,
}: {
  searchParams: Promise<{ chapter?: string }>;
}) {
  const { chapter: chapterSlug } = await searchParams;

  const [chapters, member] = await Promise.all([
    listActiveChapters(),
    getAuthedMember(),
  ]);

  if (chapters.length === 0) {
    return (
      <StateShell>
        <main className="mx-auto max-w-3xl px-4 py-15 sm:px-6 sm:py-24 text-center lg:px-8">
          <FlaskConical className="mx-auto h-10 w-10 text-muted" strokeWidth={1.25} />
          <p className="mt-4 text-sm text-muted">
            No active chapters configured yet.
          </p>
        </main>
      </StateShell>
    );
  }

  // Resolve effective chapter: explicit ?chapter= → user's primary → first.
  let activeChapter = chapters.find((c) => c.slug === chapterSlug) ?? null;

  if (!activeChapter && member) {
    const svc = createServiceClient();
    const { data: memberships } = await svc
      .from("chapter_memberships")
      .select("chapter_id, member_since")
      .eq("member_id", member.id)
      .eq("active", true)
      .order("member_since", { ascending: true })
      .limit(1);
    const primaryChapterId = memberships?.[0]?.chapter_id;
    if (primaryChapterId) {
      activeChapter =
        chapters.find((c) => c.id === primaryChapterId) ?? null;
    }
  }

  if (!activeChapter) activeChapter = chapters[0]!;

  // If the URL had no ?chapter and we picked one based on member or default,
  // bounce to the canonical URL so back/forward + sharing work cleanly.
  if (!chapterSlug) {
    redirect(`/lab?chapter=${activeChapter.slug}`);
  }

  const svc = createServiceClient();
  const [{ data: tests }, { data: office }] = await Promise.all([
    svc
      .from("lab_tests_catalog")
      .select("code, name, description, price_inr, turnaround_days, category, sort_order")
      .eq("chapter_id", activeChapter.id)
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .order("code", { ascending: true }),
    svc
      .from("office_info")
      .select("*")
      .eq("chapter_id", activeChapter.id)
      .maybeSingle(),
  ]);

  const groups: Record<string, NonNullable<typeof tests>> = {};
  for (const t of tests ?? []) {
    const key = t.category ?? "Other";
    if (!groups[key]) groups[key] = [];
    groups[key]!.push(t);
  }
  const categoryKeys = Object.keys(groups).sort();

  return (
    <StateShell>
      <main>
        {/* Hero + chapter switcher */}
        <section className="border-b border-border bg-surface">
          <div className="mx-auto max-w-7xl px-4 py-9 sm:px-6 sm:py-14 lg:px-8">
            <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
              <div className="max-w-2xl">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
                  Lab services
                </div>
                <h1 className="mt-3 !tracking-tight">
                  Testing labs across UPCBMA chapters.
                </h1>
                <p className="mt-4 text-[15px] leading-relaxed text-muted">
                  Each chapter operates its own testing lab. Pick a chapter to
                  see its catalogue, member rates, and turnaround times. Members
                  can book directly online.
                </p>
              </div>
              <ChapterPicker
                chapters={chapters}
                value={activeChapter.slug}
                basePath="/lab"
                label="Chapter lab"
              />
            </div>
          </div>
        </section>

        {/* Chapter context strip */}
        <section className="border-b border-border bg-bg">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-6 px-4 py-6 sm:px-6 sm:py-6 lg:px-8">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                Currently viewing
              </div>
              <Link
                href={`/${activeChapter.slug}`}
                className="mt-1 inline-flex items-center gap-2 text-base font-semibold text-heading no-underline hover:text-hover"
              >
                {activeChapter.name}
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
              </Link>
              {office?.address && (
                <div className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                  <MapPin className="h-3 w-3" strokeWidth={1.75} />
                  <span className="line-clamp-1 max-w-md">{office.address}</span>
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {office?.lab_phone && (
                <a
                  href={`tel:${office.lab_phone}`}
                  className="inline-flex h-10 items-center gap-2 rounded-sm border border-rule bg-bg px-4 text-sm font-medium text-heading no-underline hover:border-heading hover:bg-surface"
                >
                  <Phone className="h-3.5 w-3.5" strokeWidth={1.75} />
                  Call lab desk: {office.lab_phone}
                </a>
              )}
              <Link
                href={`/lab/book?chapter=${activeChapter.slug}`}
                className="inline-flex h-10 items-center rounded-sm bg-heading px-4 text-sm font-medium text-white no-underline hover:bg-hover"
              >
                Book a test
                <ArrowRight className="ml-2 h-4 w-4" strokeWidth={2} />
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
          {categoryKeys.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <FlaskConical className="h-8 w-8 text-muted" strokeWidth={1.5} />
              <h2 className="mt-4 !text-xl">Test catalogue coming soon.</h2>
              <p className="mt-2 max-w-md text-sm text-muted">
                The {activeChapter.city} lab&rsquo;s active test list will be
                published here. Contact the lab desk for current availability.
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
                        <div
                          key={t.code}
                          className="flex flex-col gap-2 py-5 md:flex-row md:items-start md:justify-between md:gap-8"
                        >
                          <div className="flex-1">
                            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                              <code className="rounded-sm border border-border bg-surface px-1.5 py-0.5 font-mono text-[11px] text-muted">
                                {t.code}
                              </code>
                              <h3 className="text-base font-semibold text-heading">
                                {t.name}
                              </h3>
                            </div>
                            {t.description && (
                              <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-muted">
                                {t.description}
                              </p>
                            )}
                          </div>
                          <div className="flex shrink-0 gap-8 md:justify-end">
                            <Meta
                              Icon={IndianRupee}
                              label="Member rate"
                              value={
                                t.price_inr != null
                                  ? t.price_inr.toLocaleString("en-IN")
                                  : "On request"
                              }
                            />
                            <Meta
                              Icon={Timer}
                              label="TAT"
                              value={
                                t.turnaround_days != null
                                  ? `${t.turnaround_days} d`
                                  : "On request"
                              }
                            />
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
      </main>
    </StateShell>
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
      <div className="mt-1 text-sm font-semibold text-heading tabular-nums">
        {value}
      </div>
    </div>
  );
}

