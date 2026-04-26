import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { getAuthedMember } from "@/lib/auth";
import { StateShell } from "@/components/public/state-shell";
import { Avatar } from "@/components/public/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  categoryLabel,
  priorityTone,
  statusTone,
  UPDATE_TYPES,
} from "@/lib/agendas";
import { postComment } from "./actions";
import { ArrowLeft, MessageSquare, AlertTriangle } from "lucide-react";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const svc = createServiceClient();
  const { data } = await svc.from("agendas").select("title, summary, approval_status").eq("slug", slug).maybeSingle();
  if (!data || data.approval_status !== "approved") return { title: "Agenda — UPCBMA" };
  return {
    title: `${data.title} — UPCBMA agenda`,
    description: (data.summary ?? "").slice(0, 160),
  };
}

export default async function AgendaDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { slug } = await params;
  const { error } = await searchParams;
  const me = await getAuthedMember();
  const svc = createServiceClient();

  const { data: agenda } = await svc
    .from("agendas")
    .select("*, chapter:chapters(slug, name), proposer:members!agendas_created_by_fkey(name)")
    .eq("slug", slug)
    .maybeSingle();
  if (!agenda || agenda.approval_status !== "approved") notFound();

  const [{ data: updates }, { data: comments }] = await Promise.all([
    svc
      .from("agenda_updates")
      .select("id, type, title, body, posted_at, posted_by")
      .eq("agenda_id", agenda.id)
      .order("posted_at", { ascending: false }),
    svc
      .from("agenda_comments")
      .select("id, member_id, body, posted_at")
      .eq("agenda_id", agenda.id)
      .eq("hidden", false)
      .order("posted_at", { ascending: true }),
  ]);

  // Resolve names + photos for posters and commenters
  const memberIds = new Set<string>();
  (updates ?? []).forEach((u) => u.posted_by && memberIds.add(u.posted_by));
  (comments ?? []).forEach((c) => memberIds.add(c.member_id));
  const { data: people } =
    memberIds.size > 0
      ? await svc.from("members").select("id, name, photo_url, company").in("id", Array.from(memberIds))
      : { data: [] };
  const personById = new Map<string, { name: string; photo_url: string | null; company: string | null }>();
  (people ?? []).forEach((p) => personById.set(p.id, p));

  const proposer = Array.isArray(agenda.proposer) ? agenda.proposer[0] : agenda.proposer;
  const chapter = Array.isArray(agenda.chapter) ? agenda.chapter[0] : agenda.chapter;

  return (
    <StateShell>
      <article className="mx-auto max-w-3xl px-6 py-10">
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

        {/* COMMENTS */}
        <section id="comments" className="mt-14 border-t border-border pt-10">
          <div className="flex items-baseline justify-between">
            <h2 className="!text-xl !tracking-tight">Discussion</h2>
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
              {(comments ?? []).length} {(comments ?? []).length === 1 ? "comment" : "comments"}
            </span>
          </div>

          {error && (
            <div className="mt-4 flex gap-3 rounded-sm border border-red-200 bg-red-50 p-3 text-sm text-red-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
              {error}
            </div>
          )}

          {/* Comment form OR sign-in prompt */}
          <Card className="mt-6">
            {me ? (
              <form action={postComment} className="space-y-3">
                <input type="hidden" name="slug" value={slug} />
                <div className="flex items-start gap-3">
                  <Avatar name={me.name} size="md" />
                  <div className="flex-1">
                    <div className="text-xs text-muted">
                      Commenting as <strong className="text-text">{me.name}</strong>
                    </div>
                    <textarea
                      name="body"
                      rows={3}
                      required
                      placeholder="Share what you're seeing in your factory, or add useful context…"
                      className="mt-2 w-full rounded-sm border border-border bg-bg px-3 py-2 text-sm focus-visible:border-heading focus-visible:outline-none"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" size="sm">
                    <MessageSquare className="h-3.5 w-3.5" /> Post comment
                  </Button>
                </div>
              </form>
            ) : (
              <div className="flex items-start gap-3">
                <MessageSquare className="mt-0.5 h-5 w-5 shrink-0 text-muted" strokeWidth={1.75} />
                <div className="text-sm text-text">
                  Members can join the discussion.{" "}
                  <Link
                    href={`/login?next=${encodeURIComponent("/agendas/" + slug)}`}
                    className="font-medium text-heading underline"
                  >
                    Sign in to comment
                  </Link>
                  .
                </div>
              </div>
            )}
          </Card>

          {/* Comment list */}
          {(comments ?? []).length > 0 && (
            <ul className="mt-8 space-y-6">
              {comments!.map((c) => {
                const person = personById.get(c.member_id);
                return (
                  <li key={c.id} className="flex gap-3 border-b border-border pb-6 last:border-b-0">
                    <Avatar name={person?.name ?? "?"} src={person?.photo_url} size="md" />
                    <div className="flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <div>
                          <span className="text-sm font-semibold text-heading">
                            {person?.name ?? "Member"}
                          </span>
                          {person?.company && (
                            <span className="ml-1.5 text-xs text-muted">· {person.company}</span>
                          )}
                        </div>
                        <time className="font-mono text-[10px] text-muted">
                          {new Date(c.posted_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                        </time>
                      </div>
                      <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-text">{c.body}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </article>
    </StateShell>
  );
}
