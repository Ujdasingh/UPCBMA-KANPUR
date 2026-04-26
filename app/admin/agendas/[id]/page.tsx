import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { Avatar } from "@/components/public/avatar";
import { createServiceClient } from "@/lib/supabase/server";
import { getAdminContext } from "@/lib/auth";
import {
  categoryLabel,
  priorityTone,
  statusTone,
  UPDATE_TYPES,
} from "@/lib/agendas";
import {
  postUpdate,
  deleteUpdate,
  toggleHideComment,
  approveAgenda,
  rejectAgenda,
  requestChanges,
} from "../actions";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  Trash2,
  ExternalLink,
  ShieldCheck,
  ShieldX,
  ShieldAlert,
} from "lucide-react";
import { canApproveAgenda } from "@/lib/auth";
import { approvalTone, APPROVAL_STATUS } from "@/lib/agendas";

export const dynamic = "force-dynamic";

export default async function AdminAgendaDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { id } = await params;
  const { error, ok } = await searchParams;
  const ctx = await getAdminContext();
  const svc = createServiceClient();

  const { data: agenda } = await svc
    .from("agendas")
    .select("*, proposer:members!agendas_created_by_fkey(name, email)")
    .eq("id", id)
    .maybeSingle();
  if (!agenda) notFound();
  const proposer = Array.isArray(agenda.proposer) ? agenda.proposer[0] : agenda.proposer;
  const canApprove = await canApproveAgenda(ctx.me, agenda.chapter_id);

  // Approval history
  const { data: approvals } = await svc
    .from("agenda_approvals")
    .select("id, approver_id, decision, notes, decided_at")
    .eq("agenda_id", agenda.id)
    .order("decided_at", { ascending: false });

  const [{ data: updates }, { data: comments }] = await Promise.all([
    svc
      .from("agenda_updates")
      .select("id, type, title, body, posted_at, posted_by")
      .eq("agenda_id", id)
      .order("posted_at", { ascending: false }),
    svc
      .from("agenda_comments")
      .select("id, member_id, body, posted_at, hidden")
      .eq("agenda_id", id)
      .order("posted_at", { ascending: true }),
  ]);

  // Names for posters and commenters
  const memberIds = new Set<string>();
  (updates ?? []).forEach((u) => u.posted_by && memberIds.add(u.posted_by));
  (comments ?? []).forEach((c) => memberIds.add(c.member_id));
  const { data: people } =
    memberIds.size > 0
      ? await svc.from("members").select("id, name").in("id", Array.from(memberIds))
      : { data: [] };
  const nameById = new Map<string, string>();
  (people ?? []).forEach((p) => nameById.set(p.id, p.name));

  return (
    <>
      <Link
        href="/admin/agendas"
        className="text-xs font-medium text-muted no-underline hover:text-heading"
      >
        &larr; All agendas
      </Link>
      <PageHeader
        title={agenda.title}
        description={agenda.summary ?? undefined}
        action={
          <Link
            href={`/agendas/${agenda.slug}`}
            target="_blank"
            className="inline-flex h-9 items-center gap-1.5 rounded-sm border border-border px-3 text-sm font-medium text-heading no-underline hover:border-heading hover:bg-surface"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View public page
          </Link>
        }
      />

      {error && (
        <div className="mb-5 flex gap-3 rounded-sm border border-red-200 bg-red-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" strokeWidth={1.75} />
          <div className="text-sm text-red-900">{error}</div>
        </div>
      )}
      {ok && (
        <div className="mb-5 flex gap-3 rounded-sm border border-emerald-200 bg-emerald-50 p-4">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" strokeWidth={1.75} />
          <div className="text-sm text-emerald-900">{ok}</div>
        </div>
      )}

      {/* Meta strip */}
      <Card className="mb-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="neutral">{categoryLabel(agenda.category)}</Badge>
          <span className={"inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider " + statusTone(agenda.status)}>
            {agenda.status}
          </span>
          <span className={"inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider " + priorityTone(agenda.priority)}>
            {agenda.priority} priority
          </span>
          <span className={"inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider " + approvalTone(agenda.approval_status)}>
            {APPROVAL_STATUS.find((a) => a.value === agenda.approval_status)?.label ?? agenda.approval_status}
          </span>
          <span className="text-xs text-muted">started {agenda.started_on}</span>
          {proposer && (
            <span className="text-xs text-muted">
              · proposed by <strong className="text-text">{proposer.name}</strong> ({proposer.email})
            </span>
          )}
        </div>
      </Card>

      {/* APPROVAL PANEL — visible only when pending or changes_requested AND caller can approve */}
      {(agenda.approval_status === "pending" || agenda.approval_status === "changes_requested") && (
        <Card className={"mb-5 " + (canApprove ? "border-amber-200 bg-amber-50" : "")}>
          {canApprove ? (
            <>
              <div className="mb-3 flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-amber-700" strokeWidth={1.75} />
                <h2 className="text-base font-semibold text-amber-900">Awaiting your decision</h2>
              </div>
              <p className="mb-4 text-sm text-amber-900/80">
                This agenda needs {agenda.required_approvals} approval{agenda.required_approvals === 1 ? "" : "s"} before it goes public.
                {(approvals ?? []).length > 0 && <> {(approvals ?? []).filter((a) => a.decision === "approved").length} approved so far.</>}
              </p>
              <form action={async (fd: FormData) => { "use server"; await approveAgenda(agenda.id, fd); }} className="space-y-3">
                <textarea
                  name="notes"
                  rows={2}
                  placeholder="Optional notes for the proposer or fellow approvers…"
                  className="w-full rounded-sm border border-amber-200 bg-white px-3 py-2 text-sm focus-visible:border-amber-700 focus-visible:outline-none"
                />
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" size="sm">
                    <ShieldCheck className="h-3.5 w-3.5" /> Approve
                  </Button>
                  <Button type="submit" size="sm" variant="secondary" formAction={async (fd: FormData) => { "use server"; await requestChanges(agenda.id, fd); }}>
                    Request changes
                  </Button>
                  <Button type="submit" size="sm" variant="ghost" className="text-danger" formAction={async (fd: FormData) => { "use server"; await rejectAgenda(agenda.id, fd); }}>
                    <ShieldX className="h-3.5 w-3.5" /> Reject
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex items-start gap-2">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
              <div className="text-sm text-text">
                Awaiting approval — you don&rsquo;t have approval rights for this agenda.
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Approval history */}
      {(approvals ?? []).length > 0 && (
        <Card className="mb-5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
            Approval history
          </div>
          <ul className="mt-3 space-y-2 text-xs">
            {(approvals ?? []).map((a) => (
              <li key={a.id} className="flex items-baseline gap-2">
                <span className={"inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider " + (a.decision === "approved" ? "bg-emerald-50 text-emerald-900 border-emerald-200" : a.decision === "rejected" ? "bg-red-50 text-red-900 border-red-200" : "bg-blue-50 text-blue-900 border-blue-200")}>
                  {a.decision.replace("_", " ")}
                </span>
                <span className="text-muted">
                  by <code className="font-mono">{a.approver_id}</code> · {new Date(a.decided_at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                </span>
                {a.notes && <span className="text-text">— {a.notes}</span>}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
        {/* Updates timeline */}
        <Card>
          <h2 className="mb-4 text-base font-semibold text-heading">
            Updates timeline
          </h2>

          <form action={postUpdate.bind(null, agenda.id)} className="mb-6 space-y-3 border-b border-border pb-6">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px]">
              <Field label="Update title" htmlFor="update_title" required>
                <Input
                  id="update_title"
                  name="update_title"
                  required
                  placeholder="e.g. Letter sent to UP Energy Minister"
                />
              </Field>
              <Field label="Type" htmlFor="update_type">
                <Select id="update_type" name="update_type" defaultValue="update">
                  {UPDATE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Body (optional)" htmlFor="update_body">
              <textarea
                id="update_body"
                name="update_body"
                rows={3}
                className="w-full rounded-sm border border-border bg-bg px-3 py-2 text-sm focus-visible:border-heading focus-visible:outline-none"
                placeholder="Details, links, attendees, outcomes…"
              />
            </Field>
            <div className="flex justify-end">
              <Button type="submit" size="sm">Post update</Button>
            </div>
          </form>

          {(updates ?? []).length === 0 ? (
            <p className="text-sm text-muted">
              No updates yet. Post the first one above.
            </p>
          ) : (
            <ul className="space-y-5">
              {updates!.map((u) => (
                <li key={u.id} className="flex gap-4 border-b border-border pb-5 last:border-b-0">
                  <div className="flex h-2 w-2 mt-2 shrink-0 rounded-full bg-heading" />
                  <div className="flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="text-sm font-semibold text-heading">{u.title}</h3>
                      <time className="shrink-0 font-mono text-[11px] text-muted">
                        {new Date(u.posted_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                      </time>
                    </div>
                    <div className="mt-0.5 text-xs text-muted">
                      {UPDATE_TYPES.find((t) => t.value === u.type)?.label ?? u.type}
                      {u.posted_by && (
                        <> · posted by {nameById.get(u.posted_by) ?? "—"}</>
                      )}
                    </div>
                    {u.body && (
                      <p className="mt-2 whitespace-pre-wrap text-sm text-text">{u.body}</p>
                    )}
                  </div>
                  <form action={async () => { "use server"; await deleteUpdate(u.id, agenda.id); }}>
                    <Button type="submit" size="sm" variant="ghost" className="text-danger hover:bg-red-50" aria-label="Delete update">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Comments moderation */}
        <Card>
          <h2 className="mb-4 text-base font-semibold text-heading">
            Comments ({(comments ?? []).filter((c) => !c.hidden).length} visible)
          </h2>

          {(comments ?? []).length === 0 ? (
            <p className="text-sm text-muted">No comments yet.</p>
          ) : (
            <ul className="space-y-4">
              {comments!.map((c) => (
                <li key={c.id} className={"flex gap-3 " + (c.hidden ? "opacity-50" : "")}>
                  <Avatar name={nameById.get(c.member_id) ?? "?"} size="sm" />
                  <div className="flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-xs font-semibold text-heading">
                        {nameById.get(c.member_id) ?? c.member_id}
                      </span>
                      <time className="font-mono text-[10px] text-muted">
                        {new Date(c.posted_at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                      </time>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-xs text-text">{c.body}</p>
                    <form
                      action={async () => {
                        "use server";
                        await toggleHideComment(c.id, agenda.id, !c.hidden);
                      }}
                      className="mt-1"
                    >
                      <Button type="submit" size="sm" variant="ghost" className="text-[11px]">
                        {c.hidden ? <><Eye className="mr-1 h-3 w-3" /> Unhide</> : <><EyeOff className="mr-1 h-3 w-3" /> Hide</>}
                      </Button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
