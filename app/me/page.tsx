import Link from "next/link";
import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { getAuthedMember } from "@/lib/auth";
import { StateShell } from "@/components/public/state-shell";
import { Avatar } from "@/components/public/avatar";
import { Card } from "@/components/ui/card";
import { Building2, Mail, MessageSquare, Megaphone, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "My account — UPCBMA" };

export default async function MePage() {
  const me = await getAuthedMember();
  if (!me) redirect("/login?next=/me");

  const svc = createServiceClient();

  // What chapters does this member belong to?
  const { data: memberships } = await svc
    .from("chapter_memberships")
    .select("chapter:chapters(slug, name, city), category:member_categories(name)")
    .eq("member_id", me.id);

  // What agendas have they engaged with?
  const { data: myComments } = await svc
    .from("agenda_comments")
    .select("agenda_id, posted_at, agenda:agendas(slug, title)")
    .eq("member_id", me.id)
    .eq("hidden", false)
    .order("posted_at", { ascending: false })
    .limit(10);

  const { data: myProposals } = await svc
    .from("agendas")
    .select("id, slug, title, status, approval_status, started_on")
    .eq("created_by", me.id)
    .order("created_at", { ascending: false })
    .limit(10);

  const isAdmin = me.role === "admin" || me.role === "super_admin";

  return (
    <StateShell>
      <section className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        {/* Header */}
        <div className="mb-10 flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <Avatar name={me.name} src={me.photo_url} size="lg" />
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">My account</div>
              <h1 className="mt-1 !text-3xl !tracking-tight">Welcome, {me.name.split(" ")[0]}.</h1>
              <div className="mt-1 text-sm text-muted">{me.email}</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {isAdmin && (
              <Link
                href="/admin"
                className="inline-flex h-10 items-center gap-1.5 rounded-sm bg-heading px-4 text-sm font-medium text-white no-underline hover:bg-hover"
              >
                <ShieldCheck className="h-4 w-4" strokeWidth={2} />
                Admin panel
              </Link>
            )}
            <Link
              href="/agendas/propose"
              className="inline-flex h-10 items-center gap-1.5 rounded-sm border border-rule bg-bg px-4 text-sm font-medium text-heading no-underline hover:border-heading hover:bg-surface"
            >
              <Megaphone className="h-4 w-4" strokeWidth={2} />
              Propose an agenda
            </Link>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-[1fr_2fr]">
          {/* Left: profile + chapters */}
          <div className="space-y-6">
            <Card>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Profile</div>
              <dl className="mt-3 space-y-3 text-sm">
                <div>
                  <dt className="text-xs text-muted">Name</dt>
                  <dd className="text-text">{me.name}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Login email</dt>
                  <dd className="font-mono text-xs text-text">{me.email}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Role</dt>
                  <dd className="text-text">{me.role}</dd>
                </div>
              </dl>
              {isAdmin && (
                <Link
                  href="/admin/profile"
                  className="mt-4 inline-flex h-9 items-center rounded-sm border border-border px-3 text-xs font-medium text-heading no-underline hover:border-heading hover:bg-surface"
                >
                  Edit profile
                </Link>
              )}
            </Card>

            <Card>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                <Building2 className="h-3 w-3" strokeWidth={2} />
                My chapters
              </div>
              {memberships && memberships.length > 0 ? (
                <ul className="mt-3 space-y-2 text-sm">
                  {memberships.map((m, idx) => {
                    const ch = Array.isArray(m.chapter) ? m.chapter[0] : m.chapter;
                    const cat = Array.isArray(m.category) ? m.category[0] : m.category;
                    return (
                      <li key={idx} className="flex items-baseline justify-between">
                        {ch ? (
                          <Link href={`/${ch.slug}`} className="text-heading no-underline hover:text-hover">
                            {ch.name}
                          </Link>
                        ) : (
                          <span>—</span>
                        )}
                        {cat?.name && <span className="text-xs text-muted">{cat.name}</span>}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-3 text-xs text-muted">
                  You aren&rsquo;t linked to any chapter yet. The secretariat will sort that out.
                </p>
              )}
            </Card>
          </div>

          {/* Right: my activity */}
          <div className="space-y-6">
            <Card>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                <Megaphone className="h-3 w-3" strokeWidth={2} />
                Agendas I proposed
              </div>
              {(myProposals ?? []).length === 0 ? (
                <p className="mt-3 text-sm text-muted">
                  You haven&rsquo;t proposed any yet. Got an industry issue worth tracking?{" "}
                  <Link href="/agendas/propose" className="underline">
                    Bring it forward
                  </Link>
                  .
                </p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {myProposals!.map((a) => (
                    <li key={a.id} className="flex items-baseline justify-between gap-3 border-b border-border pb-3 last:border-b-0">
                      <Link href={`/agendas/${a.slug}`} className="font-medium text-heading no-underline hover:text-hover">
                        {a.title}
                      </Link>
                      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                        {a.approval_status}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                <MessageSquare className="h-3 w-3" strokeWidth={2} />
                My recent comments
              </div>
              {(myComments ?? []).length === 0 ? (
                <p className="mt-3 text-sm text-muted">
                  No comments yet. Drop your perspective on an{" "}
                  <Link href="/agendas" className="underline">active agenda</Link>.
                </p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {myComments!.map((c, i) => {
                    const a = Array.isArray(c.agenda) ? c.agenda[0] : c.agenda;
                    return (
                      <li key={i} className="border-b border-border pb-3 last:border-b-0">
                        <Link href={`/agendas/${a?.slug}`} className="text-sm font-medium text-heading no-underline hover:text-hover">
                          {a?.title ?? "(deleted)"}
                        </Link>
                        <div className="mt-0.5 text-[10px] text-muted">
                          {new Date(c.posted_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>

            <Card>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                <Mail className="h-3 w-3" strokeWidth={2} />
                Account &amp; password
              </div>
              <p className="mt-3 text-sm text-muted">
                Need to change your password? Contact your chapter admin or the
                secretariat — self-service password reset is on the roadmap once
                we wire up email delivery.
              </p>
            </Card>
          </div>
        </div>
      </section>
    </StateShell>
  );
}
