import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { getChapterBySlug, RESERVED_SLUGS } from "@/lib/chapter-loader";
import { ChapterShell } from "@/components/public/chapter-shell";
import { Avatar } from "@/components/public/avatar";
import { CorrugatedWave } from "@/components/public/wave";
import {
  FlaskConical,
  Users,
  Landmark,
  ArrowRight,
  Newspaper,
  CalendarDays,
} from "lucide-react";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (RESERVED_SLUGS.has(slug)) return {};
  const chapter = await getChapterBySlug(slug);
  if (!chapter) return { title: "Chapter — UPCBMA" };
  return {
    title: `${chapter.name} — UPCBMA`,
    description: `Home of UPCBMA's ${chapter.city} chapter — committee, lab services, news, events.`,
  };
}

export default async function ChapterHome({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (RESERVED_SLUGS.has(slug)) notFound();
  const chapter = await getChapterBySlug(slug);
  if (!chapter) notFound();

  const svc = createServiceClient();
  const today = new Date().toISOString().slice(0, 10);

  const [
    { count: memberCount },
    { count: testCount },
    { count: committeeCount },
    { data: latestNews },
    { data: upcomingEvents },
    { data: featuredCommittee },
  ] = await Promise.all([
    svc
      .from("chapter_memberships")
      .select("*", { head: true, count: "exact" })
      .eq("chapter_id", chapter.id)
      .eq("active", true),
    svc
      .from("lab_tests_catalog")
      .select("*", { head: true, count: "exact" })
      .eq("chapter_id", chapter.id)
      .eq("active", true),
    svc
      .from("committee_appointments")
      .select("*", { head: true, count: "exact" })
      .eq("chapter_id", chapter.id)
      .eq("status", "active"),
    svc
      .from("news")
      .select("id, tag, title, body, published_date")
      .or(`chapter_id.eq.${chapter.id},chapter_id.is.null`)
      .order("published_date", { ascending: false })
      .limit(3),
    svc
      .from("events")
      .select("id, title, event_date, location, recurring, description")
      .or(`chapter_id.eq.${chapter.id},chapter_id.is.null`)
      .gte("event_date", today)
      .order("event_date", { ascending: true })
      .limit(3),
    svc
      .from("committee_appointments")
      .select(
        "id, area_name, member:members(name, company, role), role:committee_roles(name, category)",
      )
      .eq("chapter_id", chapter.id)
      .eq("status", "active")
      .order("display_order", { ascending: true })
      .limit(8),
  ]);

  const featured = (featuredCommittee ?? [])
    .filter((c) => {
      const m = Array.isArray(c.member) ? c.member[0] : c.member;
      return m?.role !== "super_admin";
    })
    .slice(0, 4);

  const stats = [
    { label: "Active members", value: memberCount != null ? String(memberCount) : "—" },
    { label: "Lab tests offered", value: testCount != null ? String(testCount) : "—" },
    { label: "Committee seats", value: committeeCount != null ? String(committeeCount) : "—" },
    { label: "Est.", value: chapter.established_on ? String(new Date(chapter.established_on).getFullYear()) : "—" },
  ];

  return (
    <ChapterShell chapter={chapter}>
      <section className="border-b border-border bg-surface">
        <div className="mx-auto max-w-7xl px-6 py-16 md:py-24">
          <div className="max-w-3xl">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
              {chapter.state} &middot; {chapter.name}
            </div>
            <h1 className="mt-4 text-4xl leading-[1.1] !tracking-tight md:text-5xl">
              Representing the corrugated box industry of {chapter.city}.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">
              {chapter.name} is a chapter of the Uttar Pradesh Corrugated Box
              Manufacturers&rsquo; Association. We advocate for manufacturers,
              run a local testing lab for members, and keep the region
              connected through regular meets and training.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={`/${chapter.slug}/lab/book`}
                className="inline-flex h-11 items-center rounded-sm bg-heading px-5 text-sm font-medium text-white no-underline hover:bg-hover"
              >
                Book a lab test
                <ArrowRight className="ml-2 h-4 w-4" strokeWidth={2} />
              </Link>
              <Link
                href={`/${chapter.slug}/committee`}
                className="inline-flex h-11 items-center rounded-sm border border-rule bg-bg px-5 text-sm font-medium text-heading no-underline hover:border-heading hover:bg-surface"
              >
                Meet the committee
              </Link>
            </div>
          </div>

          <dl className="mt-16 grid grid-cols-2 gap-x-8 gap-y-6 border-t border-border pt-8 md:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label}>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                  {s.label}
                </dt>
                <dd className="mt-1 text-3xl font-bold tracking-tight text-heading tabular-nums">
                  {s.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="text-border">
          <CorrugatedWave className="h-6 w-full" />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
            What we do
          </div>
          <h2 className="mt-2 !text-3xl !tracking-tight md:!text-4xl">
            Three pillars of the {chapter.city} chapter.
          </h2>
        </div>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          <div>
            <Landmark className="h-6 w-6 text-heading" strokeWidth={1.5} />
            <h3 className="mt-4 text-lg font-semibold text-heading">Industry advocacy</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Collective representation before state bodies, raw material
              suppliers, and regulators on behalf of {chapter.city}
              &rsquo;s manufacturers.
            </p>
          </div>
          <div>
            <FlaskConical className="h-6 w-6 text-heading" strokeWidth={1.5} />
            <h3 className="mt-4 text-lg font-semibold text-heading">In-house testing lab</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Burst strength, compression, Cobb, GSM, and more at member
              rates. Book online, drop samples at the lab desk.
            </p>
            <Link
              href={`/${chapter.slug}/lab`}
              className="mt-3 inline-block text-sm font-medium text-heading no-underline hover:text-hover"
            >
              Lab services &rarr;
            </Link>
          </div>
          <div>
            <Users className="h-6 w-6 text-heading" strokeWidth={1.5} />
            <h3 className="mt-4 text-lg font-semibold text-heading">Member network</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Member meets, training, and forums keeping {chapter.city}
              &rsquo;s industry connected on pricing and compliance.
            </p>
            <Link
              href={`/${chapter.slug}/committee`}
              className="mt-3 inline-block text-sm font-medium text-heading no-underline hover:text-hover"
            >
              Committee &rarr;
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-surface">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 py-20 md:grid-cols-2">
          <div>
            <div className="flex items-baseline justify-between">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">Latest</div>
                <h2 className="mt-1.5 !text-xl !tracking-tight">News &amp; notices</h2>
              </div>
              <Link href={`/${chapter.slug}/news`} className="text-sm font-medium text-heading no-underline hover:text-hover">
                All news &rarr;
              </Link>
            </div>
            <ul className="mt-8 space-y-6">
              {latestNews && latestNews.length > 0 ? (
                latestNews.map((n) => (
                  <li key={n.id} className="border-b border-border pb-6 last:border-b-0">
                    <Link href={`/${chapter.slug}/news/${n.id}`} className="group block no-underline">
                      <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                        <span>{n.tag}</span>
                        <span>&middot;</span>
                        <time>{fmtDate(n.published_date)}</time>
                      </div>
                      <h3 className="mt-2 text-base font-semibold text-heading group-hover:text-hover">{n.title}</h3>
                      {n.body && <p className="mt-1.5 line-clamp-2 text-sm text-muted">{n.body}</p>}
                    </Link>
                  </li>
                ))
              ) : (
                <Empty Icon={Newspaper} title="No news yet." note="Announcements will appear here once the committee posts them." />
              )}
            </ul>
          </div>

          <div>
            <div className="flex items-baseline justify-between">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">Upcoming</div>
                <h2 className="mt-1.5 !text-xl !tracking-tight">Events</h2>
              </div>
              <Link href={`/${chapter.slug}/events`} className="text-sm font-medium text-heading no-underline hover:text-hover">
                All events &rarr;
              </Link>
            </div>
            <ul className="mt-8 space-y-6">
              {upcomingEvents && upcomingEvents.length > 0 ? (
                upcomingEvents.map((e) => (
                  <li key={e.id} className="flex gap-5 border-b border-border pb-6 last:border-b-0">
                    <DateTile date={e.event_date} />
                    <div className="flex-1">
                      <h3 className="text-base font-semibold text-heading">{e.title}</h3>
                      {e.location && (
                        <div className="mt-1 text-sm text-muted">
                          {e.location}
                          {e.recurring && (
                            <span className="ml-2 rounded-sm border border-border bg-bg px-1.5 py-0.5 text-[10px] font-medium text-muted">
                              recurring
                            </span>
                          )}
                        </div>
                      )}
                      {e.description && <p className="mt-1.5 line-clamp-2 text-sm text-muted">{e.description}</p>}
                    </div>
                  </li>
                ))
              ) : (
                <Empty Icon={CalendarDays} title="No upcoming events." note="The next meet will be listed here." />
              )}
            </ul>
          </div>
        </div>
      </section>

      {featured.length > 0 && (
        <section className="mx-auto max-w-7xl px-6 py-20">
          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">Leadership</div>
              <h2 className="mt-1.5 !text-xl !tracking-tight">Executive committee</h2>
            </div>
            <Link href={`/${chapter.slug}/committee`} className="text-sm font-medium text-heading no-underline hover:text-hover">
              Full committee &rarr;
            </Link>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((c) => {
              const member = Array.isArray(c.member) ? c.member[0] : c.member;
              const role = Array.isArray(c.role) ? c.role[0] : c.role;
              return (
                <article key={c.id} className="rounded-sm border border-border bg-bg p-5">
                  <div className="flex items-start gap-3">
                    <Avatar name={member?.name ?? "?"} size="md" />
                    <div className="min-w-0">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                        {role?.name ?? "Committee member"}
                      </div>
                      <div className="mt-0.5 truncate text-base font-semibold text-heading">
                        {member?.name ?? "To be announced"}
                      </div>
                      {member?.company && <div className="truncate text-sm text-muted">{member.company}</div>}
                    </div>
                  </div>
                  {c.area_name && (
                    <div className="mt-4 border-t border-border pt-3 text-xs text-muted">Area: {c.area_name}</div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}

      <section className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-6 py-16 md:flex-row md:items-center">
          <div className="max-w-2xl">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">Lab services</div>
            <h2 className="mt-2 !text-2xl !tracking-tight">
              Test your paper and board — fast turnaround, member rates.
            </h2>
            <p className="mt-3 text-sm text-muted">
              Book online and drop samples at {chapter.city}&rsquo;s lab desk. Results within the stated TAT.
            </p>
          </div>
          <Link
            href={`/${chapter.slug}/lab/book`}
            className="inline-flex h-11 shrink-0 items-center rounded-sm bg-heading px-5 text-sm font-medium text-white no-underline hover:bg-hover"
          >
            Book a test
            <ArrowRight className="ml-2 h-4 w-4" strokeWidth={2} />
          </Link>
        </div>
      </section>
    </ChapterShell>
  );
}

function Empty({ Icon, title, note }: { Icon: typeof Newspaper; title: string; note: string }) {
  return (
    <li className="flex gap-4 border-b border-border pb-6 last:border-b-0">
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-muted" strokeWidth={1.5} />
      <div>
        <div className="text-sm font-semibold text-heading">{title}</div>
        <div className="mt-1 text-sm text-muted">{note}</div>
      </div>
    </li>
  );
}

function DateTile({ date }: { date: string }) {
  const d = new Date(date + "T00:00:00");
  const month = d.toLocaleString("en-IN", { month: "short" }).toUpperCase();
  const day = String(d.getDate()).padStart(2, "0");
  return (
    <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-sm border border-border bg-bg leading-none">
      <div className="text-[10px] font-semibold tracking-[0.15em] text-muted">{month}</div>
      <div className="mt-0.5 text-xl font-bold text-heading tabular-nums">{day}</div>
    </div>
  );
}

function fmtDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
