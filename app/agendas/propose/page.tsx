import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { getAuthedMember } from "@/lib/auth";
import { StateShell } from "@/components/public/state-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { AGENDA_CATEGORIES } from "@/lib/agendas";
import { proposeAgenda } from "./actions";
import { CheckCircle2, AlertTriangle, Send, Info } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Propose an agenda — UPCBMA" };

export default async function ProposeAgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { error, ok } = await searchParams;
  const me = await getAuthedMember();
  if (!me) {
    redirect("/login?next=" + encodeURIComponent("/agendas/propose"));
  }

  const svc = createServiceClient();
  const { data: chapters } = await svc
    .from("chapters")
    .select("id, slug, name")
    .eq("active", true)
    .order("display_order", { ascending: true });

  return (
    <StateShell>
      <section className="border-b border-border bg-surface">
        <div className="mx-auto max-w-3xl px-6 py-12">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">Propose an agenda</div>
          <h1 className="mt-3 !tracking-tight">Bring an industry issue forward.</h1>
          <p className="mt-4 text-[15px] leading-relaxed text-muted">
            Submit a short brief about a problem affecting your firm or the
            industry. An admin will review and approve it before it appears
            publicly. Once approved, every member can comment and the
            committee can post updates against it.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-10">
        {ok === "1" && (
          <div className="mb-6 flex gap-3 rounded-sm border border-emerald-200 bg-emerald-50 p-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" strokeWidth={1.75} />
            <div>
              <div className="text-sm font-semibold text-emerald-900">
                Submitted for review.
              </div>
              <div className="mt-1 text-sm text-emerald-900/80">
                The committee will review your proposal and either publish it
                or come back with questions.
              </div>
            </div>
          </div>
        )}
        {error && (
          <div className="mb-6 flex gap-3 rounded-sm border border-red-200 bg-red-50 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" strokeWidth={1.75} />
            <div className="text-sm text-red-900">{error}</div>
          </div>
        )}

        <Card>
          <form action={proposeAgenda} className="space-y-5">
            <Field label="Heading" htmlFor="title" required>
              <Input
                id="title"
                name="title"
                required
                placeholder="e.g. Sudden 12% jump in kraft paper rates this week"
              />
            </Field>

            <Field
              label="Brief (3-5 lines, shown on the agenda list)"
              htmlFor="summary"
              required
            >
              <textarea
                id="summary"
                name="summary"
                rows={3}
                required
                className="w-full rounded-sm border border-border bg-bg px-3 py-2 text-sm focus-visible:border-heading focus-visible:outline-none"
                placeholder="Short summary that helps other members understand the issue at a glance."
              />
            </Field>

            <Field
              label="Full description (optional)"
              htmlFor="body"
              hint="Background, what's at stake, who's affected, what you've already tried."
            >
              <textarea
                id="body"
                name="body"
                rows={6}
                className="w-full rounded-sm border border-border bg-bg px-3 py-2 text-sm focus-visible:border-heading focus-visible:outline-none"
              />
            </Field>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Category" htmlFor="category">
                <Select id="category" name="category" defaultValue="other">
                  {AGENDA_CATEGORIES.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Chapter scope" htmlFor="chapter_id" hint="Leave blank to propose at state level.">
                <Select id="chapter_id" name="chapter_id" defaultValue="">
                  <option value="">State-wide</option>
                  {(chapters ?? []).map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Select>
              </Field>
            </div>

            <Field
              label="Cover image URL (optional)"
              htmlFor="image_url"
              hint="Public URL of an image (e.g. a notice scan, a chart). File upload coming later."
            >
              <Input id="image_url" name="image_url" type="url" placeholder="https://…" />
            </Field>

            <div className="flex items-start gap-3 rounded-sm border border-border bg-surface p-3 text-xs text-muted">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
              <div>
                Submitting as <strong>{me.name}</strong> ({me.email}). Your
                name appears as the proposer of this agenda.
              </div>
            </div>

            <div className="flex justify-end border-t border-border pt-4">
              <Button type="submit">
                <Send className="h-4 w-4" /> Submit for review
              </Button>
            </div>
          </form>
        </Card>
      </section>
    </StateShell>
  );
}
