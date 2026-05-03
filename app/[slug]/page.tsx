import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { getChapterBySlug, RESERVED_SLUGS } from "@/lib/chapter-loader";
import { ChapterShell } from "@/components/public/chapter-shell";
import { Avatar } from "@/components/public/avatar";
import { CorrugatedWave } from "@/components/public/wave";
import { RaiseProblemForm } from "@/components/public/raise-problem-form";
import { AgendaVoteButtons } from "@/components/public/agenda-vote-buttons";
import { getVoteSummariesByAgenda } from "@/lib/agenda-engagement";
import { getAuthedMember } from "@/lib/auth";
import { statusTone, priorityTone, categoryLabel } from "@/lib/agendas";
import {
  FlaskConical,
  Users,
  Landmark,
  ArrowRight,
  Newspaper,
  CalendarDays,
  MapPin,
  Phone,
  Mail,
  Clock,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

export const revalidate = 60;

const COMMITTEE_CATEGORY_ORDER = [
  "executive",
  "office_bearer",
  "zonal",
  "advisory",
  "special",
] as const;

const COMMITTEE_CATEGORY_LABEL: Record<string, string> = {
  executive: "Executive committee",
  office_bearer: "Office bearers",
  zonal: "Zonal representatives",
  advisory: "Advisors",
  special: "Special invitees",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (RESERVED_SLUGS.has(slug)) return {};
  const chapter = await getChapterBySlug(slug);
  // Root layout already applies the "%s — UPCBMA" template, so we only set
  // the chapter-specific bit here. Otherwise the document title doubles up
  // ("Kanpur Chapter — UPCBMA — UPCBMA").
  if (!chapter) return { title: "Chapter" };
  return {
    title: chapter.name,
    description: `Home of UPCBMA's ${chapter.city} chapter — committee, lab services, news, agendas, events.`,
  };
}

export default async function ChapterHome({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { slug } = await params;
  const { ok, error } = await searchParams;
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
    { data: appointments },
    { data: activeAgendas },
    { data: office },
  ] = await Promise.all([
    // Only count *paying* members — exclude admins/super_admins/staff who are
    // also linked to the chapter via chapter_memberships. Inner-join into the
    // members table so the role filter is enforced server-side.
    svc
      .from("chapter_memberships")
      .select("member:members!inner(role)", { head: true, count: "exact" })
      .eq("chapter_id", chapter.id)
      .eq("active", true)
      .eq("member.role", "member"),
    // Lab tests count: includes state-wide rows (chapter_id IS NULL) plus
    // any chapter-specific overrides. Matches the public lab page query.
    svc
      .from("lab_tests_catalog")
      .select("*", { head: true, count: "exact" })
      .or(`chapter_id.eq.${chapter.id},chapter_id.is.null`)
      .eq("active", true),
    svc
      .from("committee_appointments")
      .select("*", { head: true, count: "exact" })
      .eq("chapter_id", chapter.id)
      .eq("status", "active"),
    svc
      .from("news")
      .select("id, tag, title, body, image_url, published_date, chapter_id")
      .or(`chapter_id.eq.${chapter.id},chapter_id.is.null`)
      .order("published_date", { ascending: false })
      .limit(5),
    svc
      .from("events")
      .select("id, title, event_date, location, recurring, description, image_url, chapter_id")
      .or(`chapter_id.eq.${chapter.id},chapter_id.is.null`)
      .gte("event_date", today)
      .order("event_date", { ascending: true })
      .limit(4),
    svc
      .from("committee_appointments")
      .select(
        "id, area_name, term_start, term_end, display_order, member:members(id, name, company, email, phone, role, photo_url, quote), role:committee_roles(key, name, category)",
      )
      .eq("chapter_id", chapter.id)
      .eq("status", "active")
      .order("display_order", { ascending: true }),
    svc
      .from("agendas")
      .select(
        "id, slug, title, summary, category, status, priority, started_on, chapter_id",
      )
      .or(`chapter_id.eq.${chapter.id},chapter_id.is.null`)
      .eq("approval_status", "approved")
      .in("status", ["active", "on_hold"])
      .order("started_on", { ascending: false })
      .limit(4),
    svc.from("office_info").select("*").eq("chapter_id", chapter.id).maybeSingle(),
  ]);

  const filteredAppointments = (appointments ?? []).filter((a) => {
    const m = Array.isArray(a.member) ? a.member[0] : a.member;
    return m?.role !== "super_admin";
  });

  // Vote summaries for the agenda cards. The summary fetch is a single
  // round-trip regardless of how many agenda cards we render.
  const meForVotes = await getAuthedMember();
  const signedIn = !!meForVotes;
  const agendaVoteSummaries = await getVoteSummariesByAgenda(
    (activeAgendas ?? []).map((a) => a.id),
  );

  // Group committee by category
  const committeeGroups: Record<string, typeof filteredAppointments> = {};
  for (const appt of filteredAppointments) {
    const role = Array.isArray(appt.role) ? appt.role[0] : appt.role;
    const cat = role?.category ?? "other";
    if (!committeeGroups[cat]) committeeGroups[cat] = [];
    committeeGroups[cat]!.push(appt);
  }
  const committeeCategoryKeys = [
    ...COMMITTEE_CATEGORY_ORDER.filter((k) => committeeGroups[k]),
    ...Object.keys(committeeGroups).filter(
      (k) => !COMMITTEE_CATEGORY_ORDER.includes(k as (typeof COMMITTEE_CATEGORY_ORDER)[number]),
    ),
  ];

  // Only include the Established tile when we actually know the year — an
  // empty "—" placeholder makes the hero look unfinished. Likewise, prefer
  // "0" over "—" for live counts so visitors don't think the data is broken.
  const stats: { label: string; value: string }[] = [
    { label: "Active members", value: String(memberCount ?? 0) },
    { label: "Lab tests", value: String(testCount ?? 0) },
    { label: "Committee seats", value: String(committeeCount ?? 0) },
  ];
  if (chapter.established_on) {
    stats.push({
      label: "Established",
      value: String(new Date(chapter.established_on).getFullYear()),
    });
  }

  // Committee email recipients for "Raise a problem"
  const committeeEmails = filteredAppointments
    .map((a) => {
      const m = Array.isArray(a.member) ? a.member[0] : a.member;
      return m?.email;
    })
    .filter((e): e is string => !!e)
    .slice(0, 8);

  return (
    <ChapterShell chapter={chapter}>
      {/* ============== HERO ============== */}
      <section className="border-b border-border bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16 md:py-24 lg:px-8">
          <div className="max-w-3xl">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
              {chapter.state} &middot; {chapter.name}
            </div>
            <h1 className="mt-3 text-3xl leading-[1.1] !tracking-tight sm:mt-4 sm:text-4xl md:text-5xl">
              Representing the corrugated box industry of {chapter.city}.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted sm:mt-6 sm:text-lg">
              {chapter.name} is a chapter of UPCBMA — the Uttar Pradesh
              Corrugated Box Manufacturers&rsquo; Association. Advocacy, lab
              testing, and member services for the {chapter.city} region.
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:mt-8 sm:flex-row sm:flex-wrap sm:gap-3">
              <Link
                href={`/lab/book?chapter=${chapter.slug}`}
                className="inline-flex h-11 items-center justify-center rounded-sm bg-heading px-5 text-sm font-medium text-white no-underline hover:bg-hover"
              >
                Book a lab test
                <ArrowRight className="ml-2 h-4 w-4" strokeWidth={2} />
              </Link>
              <a
                href="#committee"
                className="inline-flex h-11 items-center justify-center rounded-sm border border-rule bg-bg px-5 text-sm font-medium text-heading no-underline hover:border-heading hover:bg-surface"
              >
                Meet the committee
              </a>
              <a
                href="#raise-problem"
                className="inline-flex h-11 items-center justify-center rounded-sm border border-rule bg-bg px-5 text-sm font-medium text-heading no-underline hover:border-heading hover:bg-surface"
              >
                <AlertTriangle className="mr-2 h-4 w-4" strokeWidth={1.75} />
                Raise a problem
              </a>
            </div>
          </div>

          <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-border pt-6 sm:mt-16 sm:gap-x-8 sm:gap-y-6 sm:pt-8 md:grid-cols-4">
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

      {/* ============== JUMP NAV (sticky on desktop) ============== */}
      <section className="sticky top-20 z-20 hidden border-b border-border bg-bg/95 backdrop-blur-sm md:block">
        <div className="mx-auto flex max-w-7xl items-center gap-1 px-6 py-2 lg:px-8">
          <JumpLink href="#committee">Committee</JumpLink>
          <JumpLink href="#agendas">Agendas</JumpLink>
          <JumpLink href="#news">News</JumpLink>
          <JumpLink href="#events">Events</JumpLink>
          <JumpLink href="#contact">Contact</JumpLink>
          <JumpLink href="#raise-problem" tone="warn">
            Raise a problem
          </JumpLink>
        </div>
      </section>

      {/* ============== ABOUT / DATA STRIP ============== */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
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
              href={`/lab?chapter=${chapter.slug}`}
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
            <a
              href="#committee"
              className="mt-3 inline-block text-sm font-medium text-heading no-underline hover:text-hover"
            >
              Committee &rarr;
            </a>
          </div>
        </div>
      </section>

      {/* ============== COMMITTEE ============== */}
      <section id="committee" className="scroll-mt-24 border-t border-border bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
          <div className="flex items-baseline justify-between border-b border-border pb-4">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
                Leadership
              </div>
              <h2 className="mt-1.5 !text-2xl !tracking-tight md:!text-3xl">
                The people running {chapter.name}
              </h2>
            </div>
            {filteredAppointments.length > 0 && (
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                {filteredAppointments.length}{" "}
                {filteredAppointments.length === 1 ? "member" : "members"}
              </div>
            )}
          </div>

          {committeeCategoryKeys.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Landmark className="h-8 w-8 text-muted" strokeWidth={1.5} />
              <h3 className="mt-4 !text-xl">Committee to be announced.</h3>
              <p className="mt-2 max-w-md text-sm text-muted">
                The current committee will be published once elections are finalised.
              </p>
            </div>
          ) : (
            <div className="mt-10 space-y-12">
              {committeeCategoryKeys.map((cat) => {
                const list = committeeGroups[cat] ?? [];
                return (
                  <div key={cat}>
                    <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
                      {COMMITTEE_CATEGORY_LABEL[cat] ?? cap(cat)}
                    </h3>
                    <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {list.map((c) => {
                        const member = Array.isArray(c.member) ? c.member[0] : c.member;
                        const role = Array.isArray(c.role) ? c.role[0] : c.role;
                        return (
                          <article
                            key={c.id}
                            className="flex h-full flex-col rounded-sm border border-border bg-bg p-5"
                          >
                            <div className="flex items-start gap-3">
                              <Avatar
                                name={member?.name ?? "?"}
                                src={(member as any)?.photo_url}
                                size="md"
                              />
                              <div className="min-w-0 flex-1">
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
                                {c.area_name && (
                                  <div className="mt-1 text-[11px] text-muted">
                                    Area: {c.area_name}
                                  </div>
                                )}
                              </div>
                            </div>
                            {(member as any)?.quote && (
                              <blockquote className="mt-4 border-t border-border pt-3 text-xs italic leading-relaxed text-muted">
                                &ldquo;{(member as any).quote}&rdquo;
                              </blockquote>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ============== AGENDAS ============== */}
      <section id="agendas" className="scroll-mt-24 border-t border-border">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
          <div className="flex items-baseline justify-between border-b border-border pb-4">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
                Active agendas
              </div>
              <h2 className="mt-1.5 !text-2xl !tracking-tight md:!text-3xl">
                What we&rsquo;re working on
              </h2>
            </div>
            <Link
              href={`/agendas?chapter=${chapter.slug}`}
              className="text-sm font-medium text-heading no-underline hover:text-hover"
            >
              All agendas &rarr;
            </Link>
          </div>

          {!activeAgendas || activeAgendas.length === 0 ? (
            <p className="mt-10 max-w-2xl text-sm text-muted">
              No active agendas right now. When the committee files an issue
              for advocacy or members propose one, it&rsquo;ll show up here.
            </p>
          ) : (
            <ul className="mt-10 grid gap-5 md:grid-cols-2">
              {activeAgendas.map((a) => {
                const summary = agendaVoteSummaries.get(a.id) ?? {
                  up: 0,
                  down: 0,
                  myVote: null,
                };
                return (
                  <li
                    key={a.id}
                    className="group rounded-sm border border-border bg-bg p-6 transition-colors hover:border-heading"
                  >
                    <Link
                      href={`/agendas/${a.slug}`}
                      className="block no-underline"
                    >
                      <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em]">
                        <span
                          className={
                            "rounded-sm border px-1.5 py-0.5 " +
                            statusTone(a.status as any)
                          }
                        >
                          {a.status.replace("_", " ")}
                        </span>
                        <span
                          className={
                            "rounded-sm border px-1.5 py-0.5 " +
                            priorityTone(a.priority as any)
                          }
                        >
                          {a.priority}
                        </span>
                        <span className="text-muted">
                          {categoryLabel(a.category)}
                        </span>
                        {a.chapter_id === null && (
                          <span className="rounded-sm border border-border bg-surface px-1.5 py-0.5 text-[9px] text-muted">
                            state
                          </span>
                        )}
                      </div>
                      <h3 className="mt-3 text-base font-semibold text-heading group-hover:text-hover">
                        {a.title}
                      </h3>
                      {a.summary && (
                        <p className="mt-1.5 line-clamp-2 text-sm text-muted">
                          {a.summary}
                        </p>
                      )}
                      <div className="mt-3 text-[11px] text-muted">
                        Started {fmtDate(a.started_on)}
                      </div>
                    </Link>
                    {/* Vote pair sits outside the Link so clicks don't
                        navigate to the detail page accidentally. */}
                    <div className="mt-4 border-t border-border pt-3">
                      <AgendaVoteButtons
                        agendaId={a.id}
                        initial={summary}
                        signedIn={signedIn}
                        size="sm"
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {/* ============== NEWS ============== */}
      <section id="news" className="scroll-mt-24 border-t border-border bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
          <div className="flex items-baseline justify-between border-b border-border pb-4">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
                Latest
              </div>
              <h2 className="mt-1.5 !text-2xl !tracking-tight md:!text-3xl">
                News &amp; notices
              </h2>
            </div>
            <Link
              href={`/news?chapter=${chapter.slug}`}
              className="text-sm font-medium text-heading no-underline hover:text-hover"
            >
              All news &rarr;
            </Link>
          </div>

          {latestNews && latestNews.length > 0 ? (
            <ul className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {latestNews.map((n) => (
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
                      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                        <span>{n.tag}</span>
                        <span>&middot;</span>
                        <time>{fmtDate(n.published_date)}</time>
                        {n.chapter_id === null && (
                          <span className="rounded-sm border border-border bg-surface px-1.5 py-0.5 text-[9px]">
                            state
                          </span>
                        )}
                      </div>
                      <h3 className="mt-2 text-base font-semibold text-heading group-hover:text-hover">
                        {n.title}
                      </h3>
                      {n.body && (
                        <p className="mt-1.5 line-clamp-2 text-sm text-muted">{n.body}</p>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-10 text-sm text-muted">
              No news yet. Announcements will appear here once the committee posts them.
            </p>
          )}
        </div>
      </section>

      {/* ============== EVENTS ============== */}
      <section id="events" className="scroll-mt-24 border-t border-border">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
          <div className="flex items-baseline justify-between border-b border-border pb-4">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
                Upcoming
              </div>
              <h2 className="mt-1.5 !text-2xl !tracking-tight md:!text-3xl">
                Events &amp; meets
              </h2>
            </div>
            <Link
              href={`/events?chapter=${chapter.slug}`}
              className="text-sm font-medium text-heading no-underline hover:text-hover"
            >
              All events &rarr;
            </Link>
          </div>

          {upcomingEvents && upcomingEvents.length > 0 ? (
            <ul className="mt-10 divide-y divide-border">
              {upcomingEvents.map((e) => (
                <li key={e.id} className="flex gap-5 py-6 first:pt-0">
                  <DateTile date={e.event_date} />
                  <div className="flex-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <h3 className="text-base font-semibold text-heading">{e.title}</h3>
                      {e.chapter_id === null && (
                        <span className="rounded-sm border border-border bg-surface px-1.5 py-0.5 text-[10px] uppercase text-muted">
                          state
                        </span>
                      )}
                      {e.recurring && (
                        <span className="rounded-sm border border-border bg-surface px-1.5 py-0.5 text-[10px] text-muted">
                          recurring
                        </span>
                      )}
                    </div>
                    {e.location && (
                      <div className="mt-1 flex items-center gap-1.5 text-sm text-muted">
                        <MapPin className="h-3.5 w-3.5" strokeWidth={1.75} />
                        {e.location}
                      </div>
                    )}
                    {e.description && (
                      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">
                        {e.description}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-10 flex items-center gap-3 text-sm text-muted">
              <CalendarDays className="h-5 w-5" strokeWidth={1.5} />
              No upcoming events. The next meet will be listed here.
            </div>
          )}
        </div>
      </section>

      {/* ============== CONTACT + RAISE A PROBLEM (split) ============== */}
      <section
        id="contact"
        className="scroll-mt-24 border-t border-border bg-surface"
      >
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:gap-14 sm:px-6 sm:py-20 md:grid-cols-2 lg:px-8">
          {/* Contact details */}
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
              Chapter office
            </div>
            <h2 className="mt-1.5 !text-2xl !tracking-tight">
              Visit, call, or email {chapter.city}
            </h2>
            <ul className="mt-8 space-y-5 text-sm">
              {office?.address && (
                <ContactItem
                  Icon={MapPin}
                  label="Address"
                  content={<span className="whitespace-pre-line">{office.address}</span>}
                />
              )}
              {office?.phone && (
                <ContactItem
                  Icon={Phone}
                  label="Phone"
                  content={
                    <a
                      href={`tel:${office.phone}`}
                      className="text-text no-underline hover:text-heading"
                    >
                      {office.phone}
                    </a>
                  }
                />
              )}
              {office?.email && (
                <ContactItem
                  Icon={Mail}
                  label="Email"
                  content={
                    <a
                      href={`mailto:${office.email}`}
                      className="text-text no-underline hover:text-heading"
                    >
                      {office.email}
                    </a>
                  }
                />
              )}
              {office?.hours && (
                <ContactItem Icon={Clock} label="Office hours" content={office.hours} />
              )}
              {!office && (
                <li className="italic text-muted">Office details to be published.</li>
              )}
            </ul>
          </div>

          {/* Raise a problem form */}
          <div id="raise-problem" className="scroll-mt-24">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
              For members &amp; locals
            </div>
            <h2 className="mt-1.5 !text-2xl !tracking-tight">
              Raise a problem
            </h2>
            <p className="mt-3 text-sm text-muted">
              Your message goes directly to the {chapter.city} committee
              {committeeEmails.length > 0
                ? ` (${committeeEmails.length} office bearer${committeeEmails.length === 1 ? "" : "s"})`
                : ""}{" "}
              and is logged in chapter Messages so it can be tracked end to end.
            </p>

            {ok === "1" && (
              <div className="mt-5 flex gap-3 rounded-sm border border-emerald-200 bg-emerald-50 p-4">
                <CheckCircle2
                  className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700"
                  strokeWidth={1.75}
                />
                <div>
                  <div className="text-sm font-semibold text-emerald-900">
                    Your problem has been logged.
                  </div>
                  <div className="mt-1 text-sm text-emerald-900/80">
                    The committee will respond by email or phone shortly.
                  </div>
                </div>
              </div>
            )}
            {error && (
              <div className="mt-5 flex gap-3 rounded-sm border border-red-200 bg-red-50 p-4">
                <AlertTriangle
                  className="mt-0.5 h-5 w-5 shrink-0 text-red-700"
                  strokeWidth={1.75}
                />
                <div className="text-sm text-red-900">{error}</div>
              </div>
            )}

            <div className="mt-5">
              <RaiseProblemForm chapterSlug={chapter.slug} chapterCity={chapter.city} />
            </div>
          </div>
        </div>
      </section>

      {/* ============== LAB CTA ============== */}
      <section className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-6 py-16 md:flex-row md:items-center lg:px-8">
          <div className="max-w-2xl">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
              Lab services
            </div>
            <h2 className="mt-2 !text-2xl !tracking-tight">
              Test your paper and board — fast turnaround, member rates.
            </h2>
            <p className="mt-3 text-sm text-muted">
              Book online and drop samples at {chapter.city}&rsquo;s lab desk.
              Results within the stated TAT.
            </p>
          </div>
          <div className="flex shrink-0 gap-3">
            <Link
              href={`/lab?chapter=${chapter.slug}`}
              className="inline-flex h-11 items-center rounded-sm border border-rule bg-bg px-5 text-sm font-medium text-heading no-underline hover:border-heading hover:bg-surface"
            >
              View test catalogue
            </Link>
            <Link
              href={`/lab/book?chapter=${chapter.slug}`}
              className="inline-flex h-11 items-center rounded-sm bg-heading px-5 text-sm font-medium text-white no-underline hover:bg-hover"
            >
              Book a test
              <ArrowRight className="ml-2 h-4 w-4" strokeWidth={2} />
            </Link>
          </div>
        </div>
      </section>
    </ChapterShell>
  );
}

function JumpLink({
  href,
  children,
  tone,
}: {
  href: string;
  children: React.ReactNode;
  tone?: "warn";
}) {
  return (
    <a
      href={href}
      className={
        "rounded-sm px-3 py-1.5 text-xs font-medium no-underline transition-colors " +
        (tone === "warn"
          ? "ml-auto border border-amber-200 bg-amber-50 text-amber-900 hover:border-amber-300"
          : "text-muted hover:bg-surface hover:text-heading")
      }
    >
      {children}
    </a>
  );
}

function ContactItem({
  Icon,
  label,
  content,
}: {
  Icon: typeof MapPin;
  label: string;
  content: React.ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
          {label}
        </div>
        <div className="mt-0.5 text-text">{content}</div>
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

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");
}
