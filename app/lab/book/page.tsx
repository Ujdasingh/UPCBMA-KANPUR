import { createClient } from "@/lib/supabase/server";
import { PublicShell } from "@/components/public/shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { submitBooking } from "./actions";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Book a lab test — UPCBMA Kanpur Chapter",
  description:
    "Book a burst, bending, compression, cobb, or GSM test with the UPCBMA Kanpur Chapter lab. Drop samples at the lab desk once your booking is confirmed.",
};

export const dynamic = "force-dynamic"; // never cache this form

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { ok, error } = await searchParams;

  const supabase = await createClient();
  const { data: tests } = await supabase
    .from("lab_tests_catalog")
    .select("id, code, name, category, price_inr, tat_hours")
    .eq("active", true)
    .order("sort_order", { ascending: true })
    .order("code", { ascending: true });

  // Group tests by category for the checklist
  const groups: Record<string, NonNullable<typeof tests>> = {};
  for (const t of tests ?? []) {
    const key = t.category ?? "Other";
    if (!groups[key]) groups[key] = [];
    groups[key]!.push(t);
  }
  const categoryKeys = Object.keys(groups).sort();

  return (
    <PublicShell>
      <section className="border-b border-border bg-surface">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
            Lab booking
          </div>
          <h1 className="mt-3 !tracking-tight">Book a test.</h1>
          <p className="mt-4 max-w-prose text-[15px] leading-relaxed text-muted">
            Fill in the form and we&rsquo;ll confirm your slot by email or
            phone. You can drop samples at the lab desk any time during lab
            hours after confirmation.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-12">
        {ok === "1" && (
          <div className="mb-8 flex gap-3 rounded-sm border border-emerald-200 bg-emerald-50 p-4">
            <CheckCircle2
              className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700"
              strokeWidth={1.75}
            />
            <div>
              <div className="text-sm font-semibold text-emerald-900">
                Booking received.
              </div>
              <div className="mt-1 text-sm text-emerald-900/80">
                We&rsquo;ll get in touch shortly to confirm the slot and
                sample drop-off. Need another test?{" "}
                <Link
                  href="/lab/book"
                  className="font-medium text-emerald-900 underline"
                >
                  Book another
                </Link>
                .
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-8 flex gap-3 rounded-sm border border-red-200 bg-red-50 p-4">
            <AlertTriangle
              className="mt-0.5 h-5 w-5 shrink-0 text-red-700"
              strokeWidth={1.75}
            />
            <div className="text-sm text-red-900">{error}</div>
          </div>
        )}

        <Card>
          <form action={submitBooking} className="space-y-6">
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Your name" htmlFor="name" required>
                <Input id="name" name="name" required placeholder="Full name" autoComplete="name" />
              </Field>
              <Field label="Company" htmlFor="company" required>
                <Input id="company" name="company" required placeholder="Company / firm" autoComplete="organization" />
              </Field>
              <Field label="Email" htmlFor="email">
                <Input id="email" name="email" type="email" placeholder="you@company.com" autoComplete="email" />
              </Field>
              <Field label="Phone" htmlFor="phone">
                <Input id="phone" name="phone" type="tel" placeholder="+91 98xxx xxxxx" autoComplete="tel" />
              </Field>
            </div>

            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                Tests to run
              </div>
              <p className="mt-1 text-xs text-muted">
                Pick one or more. You can add notes below for specific sample
                handling instructions.
              </p>

              {categoryKeys.length === 0 ? (
                <div className="mt-4 rounded-sm border border-border bg-surface p-4 text-sm text-muted">
                  The test catalog hasn&rsquo;t been published yet. Please
                  contact the lab desk directly.
                </div>
              ) : (
                <div className="mt-4 space-y-6">
                  {categoryKeys.map((cat) => (
                    <fieldset key={cat}>
                      <legend className="text-xs font-semibold text-heading">
                        {cat}
                      </legend>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        {groups[cat]!.map((t) => (
                          <label
                            key={t.id}
                            className="flex cursor-pointer items-start gap-2 rounded-sm border border-border bg-bg px-3 py-2.5 text-sm hover:border-rule hover:bg-surface"
                          >
                            <input
                              type="checkbox"
                              name="tests"
                              value={t.id}
                              className="mt-0.5 h-4 w-4"
                            />
                            <span className="flex-1">
                              <span className="font-medium text-text">
                                {t.name}
                              </span>
                              <span className="ml-1 font-mono text-[10px] text-muted">
                                {t.code}
                              </span>
                              <span className="mt-0.5 block text-xs text-muted tabular-nums">
                                {t.price_inr != null
                                  ? `₹${t.price_inr.toLocaleString("en-IN")}`
                                  : "Price on request"}
                                {t.tat_hours != null &&
                                  ` · TAT ${t.tat_hours}h`}
                              </span>
                            </span>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  ))}
                </div>
              )}
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Sample count" htmlFor="sample_count">
                <Input
                  id="sample_count"
                  name="sample_count"
                  type="number"
                  min="1"
                  placeholder="1"
                />
              </Field>
              <Field label="Preferred drop-off date" htmlFor="preferred_date">
                <Input id="preferred_date" name="preferred_date" type="date" />
              </Field>
            </div>

            <Field label="Notes (optional)" htmlFor="notes">
              <textarea
                id="notes"
                name="notes"
                rows={4}
                className="w-full rounded-sm border border-border bg-bg px-3 py-2 text-sm focus-visible:border-heading focus-visible:outline-none"
                placeholder="Sample description, special handling, reference details…"
              />
            </Field>

            <div className="flex justify-end border-t border-border pt-6">
              <Button type="submit">Submit booking</Button>
            </div>
          </form>
        </Card>
      </section>
    </PublicShell>
  );
}
