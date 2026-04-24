import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PublicShell } from "@/components/public/shell";
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

type Stat = { label: string; value: string };

export default async function Home() {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [
    { count: memberCount },
    { count: testCount },
    { count: committeeCount },
    { data: latestNews },
    { data: upcomingEvents },
    { data: featuredCommittee },
  ] = await Promise.all([
    supabase
      .from("members")
      .select("*", { head: true, count: "exact" })
      .eq("active", true)
      .neq("role", "super_admin"),
    supabase
      .from("lab_tests_catalog")
      .select("*", { head: true, count: "exact" })
      .eq("active", true),
    supabase
      .from("committee_appointments")
      .select("*", { head: true, count: "exact" })
      .eq("status", "active"),
    supabase
      .from("news")
      .select("id, tag, title, body, published_date")
      .order("published_date", { ascending: false })
      .limit(3),
    supabase
      .from("events")
      .select("id, title, event_date, location, recurring, description")
      .gte("event_date", today)
      .order("event_date", { ascending: true })
      .limit(3),
    supabase
      .from("committee_appointments")
      .select(
        "id, area_name, member:members(name, company, role), role:committee_roles(name, category)",
      )
      .eq("status", "active")
      .order("display_order", { ascending: true })
      .limit(8),
  ]);

  // Never show super_admin appointments on the public home page.
  const featuredCommitteeSafe = (featuredCommittee ?? [])
    .filter((c) => {
      const m = Array.isArray(c.member) ? c.member[0] : c.member;
      return m?.role !== "super_admin";
    })
    .slice(0, 4);

  const stats: Stat[] = [
    { label: "Active members", value: memberCount != null ? String(memberCount) : "—" },
    { label: "Lab tests offered", value: testCount != null ? String(testCount) : "—" },
    { label: "Committee members", value: committeeCount != null ? String(committeeCount) : "—" },
    { label: "Est.", value: "1985" },
  ];

  return (
    <PublicShell>
      {/* Hero */}
      <section className="border-b border-border bg-surface">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-24">
          <div className="grid items-center gap-12 md:grid-cols-[1.2fr_1fr]">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
                Uttar Pradesh &middot; Kanpur Chapter
              </div>
              <h1 className="mt-4 text-4xl leading-[1.1] !tracking-tight md:text-5xl">
                Representing the corrugated box industry of Kanpur.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">
                UPCBMA Kanpur is the regional chapter of the Uttar Pradesh
                Corrugated Box Manufacturers&rsquo; Association. We advocate for
                manufacturers, run an in-house testing lab for members, and
                maintain a forum for industry knowledge-sharing.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/lab/book"
                  className="inline-flex h-11 items-center rounded-sm bg-heading px-5 text-sm font-medium text-white no-underline hover:bg-hover"
                >
                  Book a lab test
                  <ArrowRight className="ml-2 h-4 w-4" strokeWidth={2} />
                </Link>
                <Link
                  href="/about"
                  className="inline-flex h-11 items-center rounded-sm border border-rule bg-bg px-5 text-sm font-medium text-heading no-underline hover:border-heading hover:bg-surface"
                >
                  About the chapter
                </Link>
              </div>
            </div>

            {/* Hero image — cardboard/packaging line */}
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-sm border border-border bg-stone-200">
              <Image
                src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=900&q=70"
                alt="Stacked corrugated board ready for conversion"
                fill
                sizes="(min-width: 768px) 42vw, 100vw"
                className="object-cover"
                priority
              />
              {/* subtle dark-to-transparent gradient for text legibility context */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/30 to-transparent" />
              <div className="absolute bottom-3 left-4 right-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/85">
                Member firms across Kanpur
              </div>
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

        {/* Corrugated wave divider between hero and content */}
        <div className="text-border">
          <CorrugatedWave className="h-6 w-full" />
        </div>
      </section>

      {/* What we do */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <SectionHeader kicker="What we do" title="Three pillars of the chapter." />
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          <Pillar
            Icon={Landmark}
            title="Industry advocacy"
            body="We represent Kanpur's corrugated box manufacturers before state bodies, raw material suppliers, and regulators — negotiating on behalf of the whole regional industry."
          />
          <Pillar
            Icon={FlaskConical}
            title="In-house testing lab"
            body="An accredited testing lab offering burst strength, bending, compression, cobb value, and paper GSM tests at member rates — with booking and tracking handled online."
            cta={{ href: "/lab", label: "See lab services" }}
          />
          <Pillar
            Icon={Users}
            title="Member network"
            body="Regular meets, training sessions, and digital forums that keep members connected on pricing trends, compliance updates, and shared challenges."
            cta={{ href: "/committee", label: "Meet the committee" }}
          />
        </div>
      </section>

      {/* News + events */}
      <section className="border-t border-border bg-surface">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 md:grid-cols-2">
          <div>
            <div className="flex items-baseline justify-between">
              <SectionHeader kicker="Latest" title="News & notices" compact />
              <Link
                href="/news"
                className="text-sm font-medium text-heading no-underline hover:text-hover"
              >
                All news &rarr;
              </Link>
            </div>
            <ul className="mt-8 space-y-6">
              {latestNews && latestNews.length > 0 ? (
                latestNews.map((n) => (
                  <li key={n.id} className="border-b border-border pb-6 last:border-b-0">
                    <Link href={`/news/${n.id}`} className="group block no-underline">
                      <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                        <span>{n.tag}</span>
                        <span>&middot;</span>
                        <time>{formatDate(n.published_date)}</time>
                      </div>
                      <h3 className="mt-2 text-base font-semibold text-heading group-hover:text-hover">
                        {n.title}
                      </h3>
                      {n.body && (
                        <p className="mt-1.5 line-clamp-2 text-sm text-muted">{n.body}</p>
                      )}
                    </Link>
                  </li>
                ))
              ) : (
                <EmptyBlock
                  Icon={Newspaper}
                  title="No news yet."
                  note="Announcements will appear here once the committee posts them."
                />
              )}
            </ul>
          </div>

          <div>
            <div className="flex items-baseline justify-between">
              <SectionHeader kicker="Upcoming" title="Events" compact />
              <Link
                href="/events"
                className="text-sm font-medium text-heading no-underline hover:text-hover"
              >
                All events &rarr;
              </Link>
            </div>
            <ul className="mt-8 space-y-6">
              {upcomingEvents && upcomingEvents.length > 0 ? (
                upcomingEvents.map((e) => (
                  <li
                    key={e.id}
                    className="flex gap-5 border-b border-border pb-6 last:border-b-0"
                  >
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
                      {e.description && (
                        <p className="mt-1.5 line-clamp-2 text-sm text-muted">
                          {e.description}
                        </p>
                      )}
                    </div>
                  </li>
                ))
              ) : (
                <EmptyBlock
                  Icon={CalendarDays}
                  title="No upcoming events."
                  note="The next AGM and member meets will be listed here."
                />
              )}
            </ul>
          </div>
        </div>
      </section>

      {/* Featured committee */}
      {featuredCommitteeSafe.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 py-20">
          <div className="flex items-baseline justify-between">
            <SectionHeader kicker="Leadership" title="Executive committee" compact />
            <Link
              href="/committee"
              className="text-sm font-medium text-heading no-underline hover:text-hover"
            >
              Full committee &rarr;
            </Link>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featuredCommitteeSafe.map((c) => {
              const member = Array.isArray(c.member) ? c.member[0] : c.member;
              const role = Array.isArray(c.role) ? c.role[0] : c.role;
              return (
                <article
                  key={c.id}
                  className="rounded-sm border border-border bg-bg p-5"
                >
                  <div className="flex items-start gap-3">
                    <Avatar name={member?.name ?? "?"} size="md" />
                    <div className="min-w-0">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                        {role?.name ?? "Committee member"}
                      </div>
                      <div className="mt-0.5 truncate text-base font-semibold text-heading">
                        {member?.name ?? "To be announced"}
                      </div>
                      {member?.company && (
                        <div className="truncate text-sm text-muted">
                          {member.company}
                        </div>
                      )}
                    </div>
                  </div>
                  {c.area_name && (
                    <div className="mt-4 border-t border-border pt-3 text-xs text-muted">
                      Area: {c.area_name}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* Lab CTA */}
      <section className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-6 py-16 md:flex-row md:items-center">
          <div className="max-w-2xl">
            <SectionHeader
              kicker="Lab services"
              title="Test your paper and board — fast turnaround, member rates."
              compact
            />
            <p className="mt-3 text-sm text-muted">
              Book a test online and drop samples at the lab desk. Results are
              delivered within the stated TAT for each test. Members pay member
              rates; non-member testing is available on request.
            </p>
          </div>
          <Link
            href="/lab/book"
            className="inline-flex h-11 shrink-0 items-center rounded-sm bg-heading px-5 text-sm font-medium text-white no-underline hover:bg-hover"
          >
            Book a test
            <ArrowRight className="ml-2 h-4 w-4" strokeWidth={2} />
          </Link>
        </div>
      </section>
    </PublicShell>
  );
}

function SectionHeader({
  kicker,
  title,
  compact,
}: {
  kicker: string;
  title: string;
  compact?: boolean;
}) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
        {kicker}
      </div>
      <h2
        className={
          compact
            ? "mt-1.5 !text-xl !tracking-tight"
            : "mt-2 !text-3xl !tracking-tight md:!text-4xl"
        }
      >
        {title}
      </h2>
    </div>
  );
}

function Pillar({
  Icon,
  title,
  body,
  cta,
}: {
  Icon: typeof Landmark;
  title: string;
  body: string;
  cta?: { href: string; label: string };
}) {
  return (
    <div>
      <Icon className="h-6 w-6 text-heading" strokeWidth={1.5} />
      <h3 className="mt-4 text-lg font-semibold text-heading">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
      {cta && (
        <Link
          href={cta.href}
          className="mt-3 inline-block text-sm font-medium text-heading no-underline hover:text-hover"
        >
          {cta.label} &rarr;
        </Link>
      )}
    </div>
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

function EmptyBlock({
  Icon,
  title,
  note,
}: {
  Icon: typeof Newspaper;
  title: string;
  note: string;
}) {
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

function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
