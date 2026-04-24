import Image from "next/image";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import { listActiveChapters } from "@/lib/chapter-loader";
import { StateShell } from "@/components/public/state-shell";
import { CorrugatedWave } from "@/components/public/wave";
import {
  ArrowRight,
  MapPin,
  Newspaper,
  CalendarDays,
  Landmark,
  FlaskConical,
  Users,
} from "lucide-react";

export const revalidate = 60;

export default async function StateHome() {
  const svc = createServiceClient();
  const today = new Date().toISOString().slice(0, 10);

  const [chapters, stateNews, stateEvents, { count: totalChapters }, { count: totalMembers }] =
    await Promise.all([
      listActiveChapters(),
      svc
        .from("news")
        .select("id, tag, title, body, published_date, chapter:chapters(slug,name)")
        .is("chapter_id", null)
        .order("published_date", { ascending: false })
        .limit(3)
        .then((r) => r.data ?? []),
      svc
        .from("events")
        .select("id, title, event_date, location, description")
        .is("chapter_id", null)
        .gte("event_date", today)
        .order("event_date", { ascending: true })
        .limit(3)
        .then((r) => r.data ?? []),
      svc.from("chapters").select("*", { head: true, count: "exact" }).eq("active", true),
      svc.from("members").select("*", { head: true, count: "exact" }).eq("active", true).neq("role", "super_admin"),
    ]);

  return (
    <StateShell>
      <section className="border-b border-border bg-surface">
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
          <div className="grid items-center gap-12 md:grid-cols-[1.2fr_1fr]">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
                Uttar Pradesh &middot; Corrugated Box Industry
              </div>
              <h1 className="mt-4 text-4xl leading-[1.1] !tracking-tight md:text-5xl">
                The state body for corrugated box manufacturers of Uttar Pradesh.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">
                UPCBMA is a network of regional chapters across UP.
                Each chapter runs its own lab, committee, and member programs
                while the state body coordinates advocacy, policy, and
                statewide fixtures.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/chapters"
                  className="inline-flex h-11 items-center rounded-sm bg-heading px-5 text-sm font-medium text-white no-underline hover:bg-hover"
                >
                  Find your chapter
                  <ArrowRight className="ml-2 h-4 w-4" strokeWidth={2} />
                </Link>
                <Link
                  href="/about"
                  className="inline-flex h-11 items-center rounded-sm border border-rule bg-bg px-5 text-sm font-medium text-heading no-underline hover:border-heading hover:bg-surface"
                >
                  About UPCBMA
                </Link>
              </div>
            </div>

            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-sm border border-border bg-stone-200">
              <Image
                src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=900&q=70"
                alt="Corrugated board stack"
                fill
                sizes="(min-width: 768px) 42vw, 100vw"
                className="object-cover"
                priority
              />
            </div>
          </div>

          <dl className="mt-16 grid grid-cols-2 gap-x-8 gap-y-6 border-t border-border pt-8 md:grid-cols-4">
            <Stat label="Chapters" value={totalChapters ?? 0} />
            <Stat label="Member firms" value={totalMembers ?? 0} />
            <Stat label="Founded" value="1985" />
            <Stat label="State" value="UP" />
          </dl>
        </div>
        <div className="text-border">
          <CorrugatedWave className="h-6 w-full" />
        </div>
      </section>

      {/* Chapter grid */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">Chapters</div>
            <h2 className="mt-2 !text-3xl !tracking-tight md:!text-4xl">
              Find your chapter.
            </h2>
          </div>
          <Link href="/chapters" className="text-sm font-medium text-heading no-underline hover:text-hover">
            All chapters &rarr;
          </Link>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {chapters.map((c) => (
            <Link key={c.id} href={`/${c.slug}`} className="group rounded-sm border border-border bg-bg p-6 no-underline hover:border-heading">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                    {c.state}
                  </div>
                  <div className="mt-1 text-lg font-semibold text-heading group-hover:text-hover">
                    {c.name}
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-xs text-muted">
                    <MapPin className="h-3 w-3" strokeWidth={2} />
                    {c.city}
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted group-hover:text-heading transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
              </div>
              {c.established_on && (
                <div className="mt-4 border-t border-border pt-3 text-xs text-muted">
                  Since {new Date(c.established_on).getFullYear()}
                </div>
              )}
            </Link>
          ))}
        </div>
      </section>

      {/* What the state body does */}
      <section className="border-t border-border bg-surface">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">At state level</div>
            <h2 className="mt-2 !text-3xl !tracking-tight md:!text-4xl">
              What UPCBMA does.
            </h2>
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            <Pillar Icon={Landmark} title="Policy advocacy" body="Represents the corrugated box industry before state government bodies, coordinates on GST, environment regulations, and raw-material pricing." />
            <Pillar Icon={FlaskConical} title="Lab network" body="Every chapter runs its own testing lab. Cross-chapter member bookings are supported — a Kanpur member can test at Lucknow's lab." />
            <Pillar Icon={Users} title="Member community" body="State AGM, statewide training sessions, digital member forums. Chapters run local meets; state coordinates the calendar." />
          </div>
        </div>
      </section>

      {/* State news + events */}
      {(stateNews.length > 0 || stateEvents.length > 0) && (
        <section className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid gap-12 md:grid-cols-2">
            {stateNews.length > 0 && (
              <div>
                <div className="flex items-baseline justify-between">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">State-wide</div>
                    <h3 className="mt-1.5 !text-xl !tracking-tight">News</h3>
                  </div>
                  <Link href="/news" className="text-sm font-medium text-heading no-underline hover:text-hover">
                    All &rarr;
                  </Link>
                </div>
                <ul className="mt-6 space-y-5">
                  {stateNews.map((n) => (
                    <li key={n.id} className="border-b border-border pb-5">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                        {n.tag} &middot; {new Date(n.published_date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </div>
                      <h4 className="mt-1 text-base font-semibold text-heading">{n.title}</h4>
                      {n.body && <p className="mt-1.5 line-clamp-2 text-sm text-muted">{n.body}</p>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {stateEvents.length > 0 && (
              <div>
                <div className="flex items-baseline justify-between">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">State-wide</div>
                    <h3 className="mt-1.5 !text-xl !tracking-tight">Events</h3>
                  </div>
                  <Link href="/events" className="text-sm font-medium text-heading no-underline hover:text-hover">
                    All &rarr;
                  </Link>
                </div>
                <ul className="mt-6 space-y-5">
                  {stateEvents.map((e) => (
                    <li key={e.id} className="border-b border-border pb-5">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                        {new Date(e.event_date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </div>
                      <h4 className="mt-1 text-base font-semibold text-heading">{e.title}</h4>
                      {e.location && <div className="mt-1 text-sm text-muted">{e.location}</div>}
                      {e.description && <p className="mt-1.5 line-clamp-2 text-sm text-muted">{e.description}</p>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}
    </StateShell>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
        {label}
      </dt>
      <dd className="mt-1 text-3xl font-bold tracking-tight text-heading tabular-nums">
        {value}
      </dd>
    </div>
  );
}

function Pillar({
  Icon,
  title,
  body,
}: {
  Icon: typeof Landmark;
  title: string;
  body: string;
}) {
  return (
    <div>
      <Icon className="h-6 w-6 text-heading" strokeWidth={1.5} />
      <h3 className="mt-4 text-lg font-semibold text-heading">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
    </div>
  );
}
