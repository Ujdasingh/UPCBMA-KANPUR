import { createServiceClient } from "@/lib/supabase/server";
import { StateShell } from "@/components/public/state-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { submitMembershipRequest } from "./actions";
import { CheckCircle2, AlertTriangle, Send } from "lucide-react";

export const metadata = {
  title: "Join UPCBMA",
  description:
    "Apply for membership in the Uttar Pradesh Corrugated Box Manufacturers' Association.",
};

export const dynamic = "force-dynamic";

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { ok, error } = await searchParams;
  const svc = createServiceClient();
  const { data: chapters } = await svc
    .from("chapters")
    .select("id, slug, name, city")
    .eq("active", true)
    .order("display_order", { ascending: true });

  return (
    <StateShell>
      <section className="border-b border-border bg-surface">
        <div className="mx-auto max-w-3xl px-6 py-14">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
            Membership
          </div>
          <h1 className="mt-3 !tracking-tight">Join UPCBMA.</h1>
          <p className="mt-4 text-[15px] leading-relaxed text-muted">
            Membership is open to any corrugated box manufacturer in Uttar
            Pradesh. Submit the form below — your local chapter will reach
            out about the next step (member fee, documentation, induction).
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-10">
        {ok === "1" && (
          <div className="mb-6 flex gap-3 rounded-sm border border-emerald-200 bg-emerald-50 p-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" strokeWidth={1.75} />
            <div>
              <div className="text-sm font-semibold text-emerald-900">
                Request received.
              </div>
              <div className="mt-1 text-sm text-emerald-900/80">
                Your local chapter will get in touch to walk you through the
                next steps. Thanks for joining the industry voice.
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
          <form action={submitMembershipRequest} className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Your full name" htmlFor="name" required>
                <Input id="name" name="name" required autoComplete="name" />
              </Field>
              <Field label="Company / firm" htmlFor="company" required>
                <Input id="company" name="company" required autoComplete="organization" />
              </Field>
              <Field label="Email" htmlFor="email" required>
                <Input id="email" name="email" type="email" required autoComplete="email" />
              </Field>
              <Field label="Phone" htmlFor="phone">
                <Input id="phone" name="phone" type="tel" autoComplete="tel" />
              </Field>
              <Field label="City" htmlFor="city">
                <Input id="city" name="city" placeholder="e.g. Kanpur" />
              </Field>
              <Field label="State" htmlFor="state">
                <Input id="state" name="state" defaultValue="Uttar Pradesh" />
              </Field>
            </div>

            <Field label="Preferred chapter" htmlFor="chapter_id" hint="Pick the chapter closest to your factory. We'll route the request to them.">
              <Select id="chapter_id" name="chapter_id" defaultValue="">
                <option value="">Not sure / let UPCBMA decide</option>
                {(chapters ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.city})
                  </option>
                ))}
              </Select>
            </Field>

            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Membership category preference" htmlFor="category_preference" hint="The chapter will confirm based on its rules.">
                <Select id="category_preference" name="category_preference" defaultValue="">
                  <option value="">Not specified</option>
                  <option value="Member">Member</option>
                  <option value="Executive">Executive</option>
                </Select>
              </Field>
              <Field label="Manufacturing capacity (optional)" htmlFor="manufacturing_capacity" hint="A short note like '300 t/month' helps your chapter assess.">
                <Input id="manufacturing_capacity" name="manufacturing_capacity" placeholder="e.g. 300 t/month" />
              </Field>
            </div>

            <Field label="Notes (optional)" htmlFor="notes">
              <textarea
                id="notes"
                name="notes"
                rows={4}
                className="w-full rounded-sm border border-border bg-bg px-3 py-2 text-sm focus-visible:border-heading focus-visible:outline-none"
                placeholder="Anything you'd like the committee to know — referrer, special interests, current pain points."
              />
            </Field>

            <div className="flex items-center justify-between border-t border-border pt-5">
              <p className="text-xs text-muted">
                We&rsquo;ll only use these details to process your application.
              </p>
              <Button type="submit">
                <Send className="h-4 w-4" /> Submit request
              </Button>
            </div>
          </form>
        </Card>
      </section>
    </StateShell>
  );
}
