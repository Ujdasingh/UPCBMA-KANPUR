import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { getAuthedMember } from "@/lib/auth";
import { StateShell } from "@/components/public/state-shell";
import { AgendaComments } from "@/components/public/agenda-comments";
import { AgendaVoteButtons } from "@/components/public/agenda-vote-buttons";
import {
  categoryLabel,
  priorityTone,
  statusTone,
  UPDATE_TYPES,
} from "@/lib/agendas";
import {
  getVoteSummary,
  listAgendaComments,
} from "@/lib/agenda-engagement";
import { ArrowLeft } from "lucide-react";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const svc = createServiceClient();
  const { data } = await svc.from("agendas").select("title, summary, approval_status").eq("slug", slug).maybeSingle();
  if (!data || data.approval_status !== "approved") return { title: "Agenda" };
  return {
    title: `${data.title} · Agenda`,
    description: (data.summary ?? "").slice(0, 160),
  };
}

export default async function AgendaDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const me = await getAuthedMember();
  const svc = createServiceClient();

  const { data: agenda } = await svc
    .from("agendas")
    .select("*, chapter:chapters(slug, name), proposer:members!agendas_created_by_fkey(name)")
    .eq("slug", slug)
    .maybeSingle();
  if (!agenda || agenda.approval_status !== "approved") notFound();

  const [{ data: updates }, comments, voteSummary] = await Promise.all([
    svc
      .from("agenda_updates")
      .select("id, type, title, body, posted_at, posted_by")
      .eq("agenda_id", agenda.id)
      .order("posted_at", { ascending: false }),
    listAgendaComments(agenda.id),
    getVoteSummary(agenda.id),
  ]);

  // Update authors still need name lookups (comments come pre-joined now).
  const updateAuthorIds = new Set<string>();
  (updates ?? []).forEach((u) => u.posted_by && updateAuthorIds.add(u.posted_by));
  const { data: people } =
    updateAuthorIds.size > 0
      ? await svc
          .from("members")
          .select("id, name")
          .in("id", Array.from(updateAuthorIds))
      : { data: [] };
  const personById = new Map<string, { name: string }>();
  (people ?? []).forEach((p) => personById.set(p.id, p));

  const proposer = Array.isArray(agenda.proposer) ? agenda.proposer[0] : agenda.proposer;
  const chapter = Array.isArray(agenda.chapter) ? agenda.chapter[0] : agenda.chapter;

  return (
    <StateShell>
      <article className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
        <Link href="/agendas" className="inline-flex items-center text-xs font-medium text-muted no-underline hover:text-heading">
          <ArrowLeft className="mr-1 h-3.5 w-3.5" strokeWidth={2} />
          All agendas
        </Link>

        <div className="mt-6 flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em]">
          <span className="text-muted">{categoryLabel(agenda.category)}</span>
          <span className={"inline-flex items-center rounded-sm border px-1.5 py-0.5 " + statusTone(agenda.status)}>
            {agenda.status.replace("_", " ")}
          </span>
          <span className={"inline-flex items-center rounded-sm border px-1.5 py-0.5 " + priorityTone(agenda.priority)}>
            {agenda.priority} priority
          </span>
          {chapter && (
            <Link href={`/${chapter.slug}`} className="text-muted hover:text-heading no-underline">
              · {chapter.name}
            </Link>
          )}
        </div>

        <h1 className="mt-3 !tracking-tight">{agenda.title}</h1>

        <div className="mt-2 text-sm text-muted">
          Started {agenda.started_on}
          {proposer && <> · proposed by <strong className="text-text">{proposer.name}</strong></>}
        </div>

        {/* Vote pair sits right under the title — visible above the fold so
            members can react before they finish reading. */}
        <div className="mt-5">
          <AgendaVoteButtons
            agendaId={agenda.id}
            initial={voteSummary}
            signedIn={!!me}
            size="md"
            showWeighted
          />
        </div>

        {agenda.image_url && (
          <div className="relative mt-6 aspect-[16/9] w-full overflow-hidden rounded-sm border border-border bg-stone-100">
            <Image
              src={agenda.image_url}
              alt={agenda.title}
              fill
              sizes="(min-width: 768px) 720px, 100vw"
              className="object-cover"
              unoptimized
            />
          </div>
        )}

        {agenda.summary && (
          <p className="mt-6 text-lg leading-relaxed text-text">{agenda.summary}</p>
        )}

        {agenda.body && (
          <div className="mt-6 whitespace-pre-wrap text-[15px] leading-relaxed text-text">{agenda.body}</div>
        )}

        {/* UPDATES TIMELINE */}
        <section className="mt-12">
          <h2 className="!text-xl !tracking-tight">Updates</h2>
          {(updates ?? []).length === 0 ? (
            <p className="mt-4 text-sm text-muted">
              No updates posted yet. Check back as the committee meets and follows up.
            </p>
          ) : (
            <ol className="mt-6 space-y-6 border-l border-border pl-6">
              {updates!.map((u) => (
                <li key={u.id} className="relative">
                  <span className="absolute -left-[31px] top-1.5 inline-block h-2.5 w-2.5 rounded-full border-2 border-border bg-bg" />
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-sm font-semibold text-heading">{u.title}</h3>
                    <time className="shrink-0 font-mono text-[11px] text-muted">
                      {new Date(u.posted_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                    </time>
                  </div>
                  <div className="mt-0.5 text-xs text-muted">
                    {UPDATE_TYPES.find((t) => t.value === u.type)?.label ?? u.type}
                    {u.posted_by && (() => {
                      const p = personById.get(u.posted_by);
                      return p ? <> · {p.name}</> : null;
                    })()}
                  </div>
                  {u.body && (
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-text">{u.body}</p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* DISCUSSION — votes above, threaded comments below */}
        <div className="mt-14 border-t border-border pt-10">
          <AgendaComments
            agendaId={agenda.id}
            initial={comments}
            signedInMemberId={me?.id}
            signInHref={`/login?next=${encodeURIComponent("/agendas/" + slug)}`}
          />
        </div>
      </article>
    </StateShell>
  );
}
