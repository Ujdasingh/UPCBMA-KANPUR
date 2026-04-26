import Image from "next/image";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import { listActiveChapters } from "@/lib/chapter-loader";
import { getSetting } from "@/lib/site-settings";
import { StateShell } from "@/components/public/state-shell";
import { CorrugatedWave } from "@/components/public/wave";
import {
  ArrowRight,
  MapPin,
  UserPlus,
  Newspaper,
  CalendarDays,
  Megaphone,
  Image as ImageIcon,
} from "lucide-react";

export const revalidate = 60;

export default async function StateHome() {
  const svc = createServiceClient();
  const today = new Date().toISOString().slice(0, 10);

  const [
    chapters,
    stateNews,
    upcomingEvents,
    pastEvents,
    activeAgendas,
    { count: totalChapters },
    { count: totalMembers },
    tagline,
    marketValue,
  ] = await Promise.all([
    listActiveChapters(),
    svc.from("news").select("id, tag, title, body, published_date").is("chapter_id", null).order("published_date", { ascending: false }).limit(3).then((r) => r.data ?? []),
    svc.from("events").select("id, title, event_date, location, description").is("chapter_id", null).gte("event_date", today).order("event_date", { ascending: true }).limit(4).then((r) => r.data ?? []),
    svc.from("events").select("id, title, event_date, location, description").is("chapter_id", null).lt("event_date", today).order("event_date", { ascending: false }).limit(6).then((r) => r.data ?? []),
    svc.from("agendas").select("id, slug, title, summary, category").eq("approval_status", "approved").eq("status", "active").is("chapter_id", null).order("started_on", { ascending: false }).limit(3).then((r) => r.data ?? []),
    svc.from("chapters").select("*", { head: true, count: "exact" }).eq("active", true),
    svc.from("members").select("*", { head: true, count: "exact" }).eq("active", true).neq("role", "super_admin"),
    getSetting("state_tagline"),
    getSetting("state_market_value"),
  ]);

  return (
    <StateShell>
      {/* ====== HERO ====== */}
      <section className="border-b border-border bg-surface">
        <div className="mx-auto max-w-7xl px-6 py-16 md:py-24">
          <div className="grid items-center gap-12 md:grid-cols-[1.2fr_1fr]">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
                Uttar Pradesh · Corrugated Box Industry
              </div>
              <h1 className="mt-4 text-4xl leading-[1.1] !tracking-tight md:text-5xl">
                One voice for the corrugated box industry of Uttar Pradesh.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">
                {tagline ??
                  "UPCBMA unites manufacturers across UP to fight industry issues — gas, paper rates, supply chain, regulation — and to share lab testing, knowledge, and member services through regional chapters."}
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/join"
                  className="inline-flex h-11 items-center gap-2 rounded-sm bg-heading px-5 text-sm font-medium text-white no-underline hover:bg-hover"
                >
                  <UserPlus className="h-4 w-4" strokeWidth={2} />
                  Join UPCBMA
                </Link>
                <Link
                  href="/agendas"
                  className="inline-flex h-11 items-center gap-2 rounded-sm border border-rule bg-bg px-5 text-sm font-medium text-heading no-underline hover:border-heading hover:bg-surface"
                >
                  <Megaphone className="h-4 w-4" strokeWidth={2} />
                  Live agendas
                </Link>
              </div>
            </div>

            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-sm border border-border bg-stone-200">
              <Image
                src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=900&q=70"
                alt="Corrugated board stacked at a manufacturing facility"
                fill
                sizes="(min-width: 768px) 42vw, 100vw"
                className="object-cover"
                priority
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/40 to-transparent" />
              <div className="absolute bottom-3 left-4 right-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/85">
                Member firms across Uttar Pradesh
              </div>
            </div>
          </div>
        </div>
        <div className="text-border">
          <CorrugatedWave className="h-6 w-full" />
        </div>
      </section>

      {/* ====== STATS STRIP ====== */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <dl className="grid grid-cols-2 gap-x-8 gap-y-8 md:grid-cols-4">
            <Stat label="Member firms" value={totalMembers != null ? String(totalMembers) : "—"} hint="Active across all chapters" />
            <Stat label="Chapters" value={totalChapters != null ? String(totalChapters) : "—"} hint="Cities and growing" />
            <Stat label="UP market" value={marketValue ?? "—"} hint="Estimated industry size" />
            <Stat label="Founded" value="1985" hint="Decades of advocacy" />
          </dl>
        </div>
      </section>

      {/* ====== ABOUT TEASER ====== */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-10 md:grid-cols-[1fr_1.5fr]">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">About UPCBMA</div>
            <h2 className="mt-2 !text-3xl !tracking-tight">
              The state body for UP&rsquo;s corrugators.
            </h2>
          </div>
          <div>
            <p className="text-[15px] leading-relaxed text-text">
              UPCBMA is a network of regional chapters across Uttar Pradesh
              — Kanpur, Lucknow, Agra, Meerut, and more. Each chapter runs
              its own local lab, committee, and member programs while the
              state body coordinates advocacy, policy, and statewide
              fixtures.
            </p>
            <p className="mt-4 text-[15px] leading-relaxed text-text">
              On any given month the secretariat is engaging suppliers on
              pricing, responding to compliance circulars, coordinating
              training, and supporting chapter labs. Chapters handle local
              operations; the state body handles the connective tissue.
            </p>
            <Link
              href="/about"
              className="mt-5 inline-flex items-center text-sm font-medium text-heading no-underline hover:text-hover"
            >
              Read the full story <ArrowRight className="ml-1 h-3.5 w-3.5" strokeWidth={2} />
            </Link>
          </div>
        </div>
      </section>

      {/* ====== ACTIVE AGENDAS ====== */}
      {activeAgendas.length > 0 && (
        <section className="border-y border-border bg-surface">
          <div className="mx-auto max-w-7xl px-6 py-16">
            <div className="flex items-baseline justify-between">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">Live agendas</div>
                <h2 className="mt-2 !text-2xl !tracking-tight">What we&rsquo;re working on right now.</h2>
              </div>
              <Link href="/agendas" className="text-sm font-medium text-heading no-underline hover:text-hover">
                All agendas &rarr;
              </Link>
            </div>
            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {activeAgendas.map((a) => (
                <Link key={a.id} href={`/agendas/${a.slug}`} className="rounded-sm border border-border bg-bg p-5 no-underline hover:border-heading">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">{a.category}</div>
                  <h3 className="mt-2 text-base font-semibold text-heading">{a.title}</h3>
                  {a.summary && <p className="mt-1.5 line-clamp-3 text-sm text-muted">{a.summary}</p>}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ====== CHAPTERS ====== */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">Chapters</div>
            <h2 className="mt-2 !text-3xl !tracking-tight md:!text-4xl">Find your chapter.</h2>
          </div>
          <Link href="/chapters" className="text-sm font-medium text-heading no-underline hover:text-hover">
            Directory &rarr;
          </Link>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {chapters.map((c) => (
            <Link key={c.id} href={`/${c.slug}`} className="group rounded-sm border border-border bg-bg p-6 no-underline hover:border-heading">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">{c.state}</div>
                  <div className="mt-1 text-lg font-semibold text-heading group-hover:text-hover">{c.name}</div>
                  <div className="mt-1 flex items-center gap-1 text-xs text-muted">
                    <MapPin className="h-3 w-3" strokeWidth={2} />
                    {c.city}
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-heading" strokeWidth={2} />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ====== EVENTS / GALLERY ====== */}
      <section className="border-y border-border bg-surface">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">Events</div>
              <h2 className="mt-2 !text-2xl !tracking-tight">Meets, training, recent gatherings.</h2>
            </div>
            <Link href="/events" className="text-sm font-medium text-heading no-underline hover:text-hover">
              All events &rarr;
            </Link>
          </div>

          {upcomingEvents.length > 0 && (
            <>
              <div className="mt-10 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">Upcoming</div>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                {upcomingEvents.map((e) => (
                  <div key={e.id} className="flex gap-4 rounded-sm border border-border bg-bg p-4">
                    <DateTile date={e.event_date} />
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-heading">{e.title}</h3>
                      {e.location && <div className="mt-1 text-xs text-muted">{e.location}</div>}
                      {e.description && <p className="mt-1.5 line-clamp-2 text-xs text-muted">{e.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {pastEvents.length > 0 && (
            <>
              <div className="mt-10 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">Recent</div>
              <ul className="mt-3 grid gap-4 md:grid-cols-3">
                {pastEvents.map((e) => (
                  <li key={e.id} className="rounded-sm border border-border bg-bg p-4 opacity-90">
                    <DateTile date={e.event_date} dim />
                    <h3 className="mt-3 text-sm font-semibold text-heading">{e.title}</h3>
                    {e.location && <div className="mt-1 text-xs text-muted">{e.location}</div>}
                  </li>
                ))}
              </ul>
            </>
          )}

          {upcomingEvents.length === 0 && pastEvents.length === 0 && (
            <div className="mt-10 flex flex-col items-center justify-center rounded-sm border border-dashed border-border bg-bg py-12 text-center">
              <ImageIcon className="h-7 w-7 text-muted" strokeWidth={1.5} />
              <p className="mt-3 max-w-md text-sm text-muted">
                Photo gallery and event index coming up here as state-wide
                events get scheduled. Each chapter&rsquo;s events stay on its
                own page.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ====== NEWS ====== */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">News</div>
            <h2 className="mt-2 !text-2xl !tracking-tight">Statewide announcements.</h2>
          </div>
          <Link href="/news" className="text-sm font-medium text-heading no-underline hover:text-hover">
            All news &rarr;
          </Link>
        </div>

        <ul className="mt-8 grid gap-5 md:grid-cols-3">
          {stateNews.length > 0 ? (
            stateNews.map((n) => (
              <li key={n.id} className="rounded-sm border border-border bg-bg p-5">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                  {n.tag} · {fmtDate(n.published_date)}
                </div>
                <Link href={`/news/${n.id}`} className="mt-2 block no-underline">
                  <h3 className="text-base font-semibold text-heading hover:text-hover">{n.title}</h3>
                </Link>
                {n.body && <p className="mt-1.5 line-clamp-3 text-sm text-muted">{n.body}</p>}
              </li>
            ))
          ) : (
            <li className="rounded-sm border border-dashed border-border bg-surface p-6 text-center md:col-span-3">
              <Newspaper className="mx-auto h-7 w-7 text-muted" strokeWidth={1.5} />
              <p className="mt-3 text-sm text-muted">
                State-wide announcements will appear here. Chapter-specific
                news lives on each chapter&rsquo;s own page.
              </p>
            </li>
          )}
        </ul>
      </section>
    </StateShell>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">{label}</dt>
      <dd className="mt-2 text-3xl font-bold tracking-tight text-heading tabular-nums md:text-4xl">{value}</dd>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </div>
  );
}

function DateTile({ date, dim }: { date: string; dim?: boolean }) {
  const d = new Date(date + "T00:00:00");
  const month = d.toLocaleString("en-IN", { month: "short" }).toUpperCase();
  const day = String(d.getDate()).padStart(2, "0");
  return (
    <div className={"flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-sm border leading-none " + (dim ? "border-border bg-surface text-muted" : "border-border bg-bg")}>
      <div className="text-[10px] font-semibold tracking-[0.15em] text-muted">{month}</div>
      <div className="mt-0.5 text-xl font-bold text-heading tabular-nums">{day}</div>
    </div>
  );
}

function fmtDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// keep unused symbol importable for future variants
const _icons = { CalendarDays };
