import Link from "next/link";
import { StateShell } from "@/components/public/state-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { submitContact } from "./actions";
import { CheckCircle2, AlertTriangle, Building2 } from "lucide-react";

export const metadata = {
  title: "Contact — UPCBMA",
  description: "Contact the UPCBMA secretariat.",
};

export const dynamic = "force-dynamic";

export default async function StateContactPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { ok, error } = await searchParams;

  return (
    <StateShell>
      <section className="border-b border-border bg-surface">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">Contact</div>
          <h1 className="mt-3 !tracking-tight">Contact UPCBMA secretariat.</h1>
          <p className="mt-4 text-[15px] leading-relaxed text-muted">
            For state-level enquiries — policy, membership at state body
            level, press, and statewide events. For{" "}
            <strong>chapter-specific</strong> questions (lab bookings,
            chapter membership, local committee), please{" "}
            <Link href="/chapters" className="underline">find your chapter</Link>{" "}
            and use its contact page.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-14 px-6 py-14 md:grid-cols-[1fr_1.6fr]">
        <div className="space-y-8">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">Looking for a chapter?</div>
            <h2 className="mt-2 !text-xl !tracking-tight">Pick from the directory</h2>
            <p className="mt-2 text-sm text-muted">
              Chapters have their own secretariats, labs, and contact forms.
            </p>
            <Link
              href="/chapters"
              className="mt-4 inline-flex h-10 items-center rounded-sm border border-rule bg-bg px-4 text-sm font-medium text-heading no-underline hover:border-heading hover:bg-surface"
            >
              <Building2 className="mr-1.5 h-4 w-4" strokeWidth={2} />
              Chapter directory
            </Link>
          </div>
        </div>

        <div>
          {ok === "1" && (
            <div className="mb-6 flex gap-3 rounded-sm border border-emerald-200 bg-emerald-50 p-4">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" strokeWidth={1.75} />
              <div>
                <div className="text-sm font-semibold text-emerald-900">Message sent.</div>
                <div className="mt-1 text-sm text-emerald-900/80">
                  The secretariat will get back to you.
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
            <form action={submitContact} className="space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Your name" htmlFor="name" required>
                  <Input id="name" name="name" required autoComplete="name" placeholder="Full name" />
                </Field>
                <Field label="Company (optional)" htmlFor="company">
                  <Input id="company" name="company" autoComplete="organization" />
                </Field>
                <Field label="Email" htmlFor="email">
                  <Input id="email" name="email" type="email" autoComplete="email" />
                </Field>
                <Field label="Phone" htmlFor="phone">
                  <Input id="phone" name="phone" type="tel" autoComplete="tel" />
                </Field>
              </div>
              <Field label="Subject (optional)" htmlFor="subject">
                <Input id="subject" name="subject" />
              </Field>
              <Field label="Message" htmlFor="message" required>
                <textarea id="message" name="message" rows={6} required className="w-full rounded-sm border border-border bg-bg px-3 py-2 text-sm focus-visible:border-heading focus-visible:outline-none" />
              </Field>
              <div className="flex items-center justify-between border-t border-border pt-5">
                <p className="text-xs text-muted">Provide at least an email or phone.</p>
                <Button type="submit">Send message</Button>
              </div>
            </form>
          </Card>
        </div>
      </section>
    </StateShell>
  );
}
