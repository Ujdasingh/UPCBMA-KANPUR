import Link from "next/link";
import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { getAuthedMember } from "@/lib/auth";
import { StateShell } from "@/components/public/state-shell";
import { Avatar } from "@/components/public/avatar";
import {
  ArrowRight,
  Building2,
  ChevronRight,
  KeyRound,
  Megaphone,
  MessageSquare,
  ShieldCheck,
  UserCog,
} from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "My account — UPCBMA" };

/**
 * /me — the post-login member dashboard.
 *
 * Mobile-first redesign: three big tap targets up top (My chapter, Edit
 * profile, Change password). Activity (proposed agendas, comments) lives
 * inside a `<details>` so the home view stays scannable. Admin shortcut
 * appears only for admin/super_admin.
 *
 * The previous version had five Card sections side by side — too dense to
 * use on a phone.
 */
export default async function MePage() {
  const me = await getAuthedMember();
  if (!me) redirect("/login?next=/me");

  const svc = createServiceClient();

  const [
    { data: meRow },
    { data: memberships },
    { data: myProposals },
    { data: myComments },
  ] = await Promise.all([
    svc
      .from("members")
      .select("must_change_password")
      .eq("id", me.id)
      .maybeSingle(),
    svc
      .from("chapter_memberships")
      .select("chapter:chapters(slug, name, city)")
      .eq("member_id", me.id)
      .eq("active", true)
      .order("member_since", { ascending: true }),
    svc
      .from("agendas")
      .select("id, slug, title, approval_status")
      .eq("created_by", me.id)
      .order("created_at", { ascending: false })
      .limit(10),
    svc
      .from("agenda_comments")
      .select("agenda_id, posted_at, agenda:agendas(slug, title)")
      .eq("member_id", me.id)
      .eq("hidden", false)
      .order("posted_at", { ascending: false })
      .limit(10),
  ]);

  const needsPasswordChange = meRow?.must_change_password === true;
  const isAdmin = me.role === "admin" || me.role === "super_admin";

  // Resolve a primary chapter for the "My chapter" tile.
  const primary = (memberships ?? [])
    .map((m) => (Array.isArray(m.chapter) ? m.chapter[0] : m.chapter))
    .filter(Boolean)[0] as { slug: string; name: string; city: string } | undefined;

  return (
    <StateShell>
      <section className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        {/* Header — compact on mobile */}
        <div className="flex items-center gap-3 sm:gap-4">
          <Avatar name={me.name} src={me.photo_url} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
              My account
            </div>
            <h1 className="mt-0.5 truncate !text-xl !tracking-tight sm:!text-2xl">
              Hi, {me.name.split(" ")[0]}.
            </h1>
            <div className="truncate text-xs text-muted sm:text-sm">
              {me.email}
            </div>
          </div>
        </div>

        {/* Soft password reminder for first-time invitees */}
        {needsPasswordChange && (
          <div className="mt-6 flex flex-col gap-3 rounded-sm border border-amber-200 bg-amber-50 p-4 text-sm sm:flex-row sm:items-start">
            <KeyRound
              className="h-5 w-5 shrink-0 text-amber-700"
              strokeWidth={1.75}
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-amber-900">
                Set your own password
              </div>
              <div className="mt-0.5 text-amber-900/90">
                You&rsquo;re still on the temporary one from your invite.
              </div>
            </div>
            <Link
              href="/me/change-password"
              className="inline-flex h-10 shrink-0 items-center justify-center rounded-sm bg-amber-600 px-4 text-sm font-medium text-white no-underline hover:bg-amber-700"
            >
              Change now
            </Link>
          </div>
        )}

        {/* Primary actions — three big tap targets */}
        <div className="mt-6 grid gap-3 sm:mt-8 sm:grid-cols-3">
          {primary ? (
            <ActionTile
              href={`/${primary.slug}`}
              Icon={Building2}
              label="My chapter"
              detail={primary.name}
              tone="primary"
            />
          ) : (
            <ActionTile
              href="/chapters"
              Icon={Building2}
              label="Find your chapter"
              detail="Pick from the directory"
              tone="primary"
            />
          )}
          <ActionTile
            href="/me/profile"
            Icon={UserCog}
            label="Edit profile"
            detail="Photo, quote, contact"
          />
          <ActionTile
            href="/me/change-password"
            Icon={KeyRound}
            label="Password"
            detail="Pick a new one"
          />
        </div>

        {/* Admin shortcut */}
        {isAdmin && (
          <Link
            href="/admin"
            className="mt-3 flex items-center justify-between rounded-sm border border-heading bg-heading px-4 py-3 text-sm font-medium text-white no-underline hover:bg-hover"
          >
            <span className="inline-flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" strokeWidth={2} />
              Open admin panel
            </span>
            <ArrowRight className="h-4 w-4" strokeWidth={2} />
          </Link>
        )}

        {/* Activity — collapsed by default on mobile so the home view stays clean */}
        {((myProposals ?? []).length > 0 || (myComments ?? []).length > 0) && (
          <details className="group mt-6 rounded-sm border border-border bg-surface">
            <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-heading">
              <span className="inline-flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-muted" strokeWidth={2} />
                My activity
              </span>
              <ChevronRight
                className="h-4 w-4 text-muted transition-transform group-open:rotate-90"
                strokeWidth={2}
              />
            </summary>
            <div className="space-y-5 border-t border-border bg-bg p-4">
              {(myProposals ?? []).length > 0 && (
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                    Agendas I proposed
                  </div>
                  <ul className="mt-2 divide-y divide-border">
                    {myProposals!.map((a) => (
                      <li key={a.id} className="flex items-baseline justify-between gap-3 py-2">
                        <Link
                          href={`/agendas/${a.slug}`}
                          className="truncate text-sm font-medium text-heading no-underline hover:text-hover"
                        >
                          {a.title}
                        </Link>
                        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
                          {a.approval_status}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {(myComments ?? []).length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                    <MessageSquare className="h-3 w-3" strokeWidth={2} />
                    Recent comments
                  </div>
                  <ul className="mt-2 divide-y divide-border">
                    {myComments!.map((c, i) => {
                      const a = Array.isArray(c.agenda) ? c.agenda[0] : c.agenda;
                      return (
                        <li key={i} className="py-2">
                          <Link
                            href={`/agendas/${a?.slug}`}
                            className="text-sm font-medium text-heading no-underline hover:text-hover"
                          >
                            {a?.title ?? "(deleted)"}
                          </Link>
                          <div className="mt-0.5 text-[10px] text-muted">
                            {new Date(c.posted_at).toLocaleString("en-IN", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          </details>
        )}
      </section>
    </StateShell>
  );
}

/**
 * Big tap-friendly tile used for /me's primary actions. Min height of ~80px
 * keeps it comfortable for thumbs on a phone. `tone="primary"` paints the
 * CTA in the brand colour for the most-used action.
 */
function ActionTile({
  href,
  Icon,
  label,
  detail,
  tone,
}: {
  href: string;
  Icon: typeof Building2;
  label: string;
  detail: string;
  tone?: "primary";
}) {
  const isPrimary = tone === "primary";
  return (
    <Link
      href={href}
      className={
        "group flex items-center gap-3 rounded-sm border p-4 no-underline transition-colors " +
        (isPrimary
          ? "border-heading bg-heading text-white hover:bg-hover"
          : "border-border bg-bg text-text hover:border-heading hover:bg-surface")
      }
    >
      <Icon
        className={
          "h-6 w-6 shrink-0 " + (isPrimary ? "text-white" : "text-muted")
        }
        strokeWidth={1.75}
      />
      <div className="min-w-0 flex-1">
        <div
          className={
            "text-sm font-semibold " + (isPrimary ? "text-white" : "text-heading")
          }
        >
          {label}
        </div>
        <div
          className={
            "mt-0.5 truncate text-xs " +
            (isPrimary ? "text-white/80" : "text-muted")
          }
        >
          {detail}
        </div>
      </div>
      <ArrowRight
        className={
          "h-4 w-4 shrink-0 " + (isPrimary ? "text-white" : "text-muted")
        }
        strokeWidth={2}
      />
    </Link>
  );
}
