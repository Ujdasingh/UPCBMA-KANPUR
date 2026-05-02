import Link from "next/link";
import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { listActiveChapters } from "@/lib/chapter-loader";
import { getAuthedMember } from "@/lib/auth";
import { StateShell } from "@/components/public/state-shell";
import { ChapterPicker } from "@/components/public/chapter-picker";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { submitStateBooking } from "./actions";
import {
  CheckCircle2,
  AlertTriangle,
  LogIn,
  ArrowLeft,
  FlaskConical,
} from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Book a lab test",
  description:
    "Members: book a sample test at any UPCBMA chapter lab. Your booking is sent to the chapter admin and lab desk.",
};

/**
 * Login-gated state-level booking form.
 *  • If not signed in → friendly call-to-action to /login (with ?next= so we
 *    bounce back here after).
 *  • If signed in → chapter dropdown (default to member's primary chapter)
 *    plus the test selection. Submission lands in `bookings` with chapter_id
 *    set so the chapter admin sees it under /admin/bookings; the chapter's
 *    lab login (admin scoped to that chapter) is the same set of users.
 */
export default async function StateBookPage({
  searchParams,
}: {
  searchParams: Promise<{
    chapter?: string;
    ok?: string;
    error?: string;
  }>;
}) {
  const { chapter: chapterSlug, ok, error } = await searchParams;

  const [chapters, member] = await Promise.all([
    listActiveChapters(),
    getAuthedMember(),
  ]);

  if (!member) {
    return (
      <StateShell>
        <SignInGate slug={chapterSlug} />
      </StateShell>
    );
  }

  if (chapters.length === 0) {
    return (
      <StateShell>
        <main className="mx-auto max-w-3xl px-6 py-24 text-center lg:px-8">
          <FlaskConical className="mx-auto h-10 w-10 text-muted" strokeWidth={1.25} />
          <p className="mt-4 text-sm text-muted">
            No active chapters available for booking.
          </p>
        </main>
      </StateShell>
    );
  }

  // Resolve effective chapter: ?chapter= → member's primary → first.
  let activeChapter = chapters.find((c) => c.slug === chapterSlug) ?? null;

  if (!activeChapter) {
    const svc = createServiceClient();
    const { data: memberships } = await svc
      .from("chapter_memberships")
      .select("chapter_id, member_since")
      .eq("member_id", member.id)
      .eq("active", true)
      .order("member_since", { ascending: true })
      .limit(1);
    const primaryChapterId = memberships?.[0]?.chapter_id;
    if (primaryChapterId) {
      activeChapter =
        chapters.find((c) => c.id === primaryChapterId) ?? null;
    }
  }
  if (!activeChapter) activeChapter = chapters[0]!;

  if (!chapterSlug) {
    redirect(`/lab/book?chapter=${activeChapter.slug}`);
  }

  const svc = createServiceClient();
  const [{ data: tests }, { data: memberRow }] = await Promise.all([
    svc
      .from("lab_tests_catalog")
      .select("code, name, category, price_inr, turnaround_days")
      .eq("chapter_id", activeChapter.id)
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .order("code", { ascending: true }),
    svc
      .from("members")
      .select("name, email, phone, company")
      .eq("id", member.id)
      .maybeSingle(),
  ]);

  const groups: Record<string, NonNullable<typeof tests>> = {};
  for (const t of tests ?? []) {
    const key = t.category ?? "Other";
    if (!groups[key]) groups[key] = [];
    groups[key]!.push(t);
  }
  const categoryKeys = Object.keys(groups).sort();

  return (
    <StateShell>
      <main>
        {/* Hero + chapter selector */}
        <section className="border-b border-border bg-surface">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
            <Link
              href={`/lab?chapter=${activeChapter.slug}`}
              className="inline-flex items-center text-xs font-medium text-muted no-underline hover:text-heading"
            >
              <ArrowLeft className="mr-1 h-3.5 w-3.5" strokeWidth={2} />
              Back to lab catalogue
            </Link>
            <div className="mt-4 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div className="max-w-2xl">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
                  Lab booking
                </div>
                <h1 className="mt-3 !tracking-tight">
                  Book a test at {activeChapter.city}.
                </h1>
                <p className="mt-3 max-w-prose text-[15px] leading-relaxed text-muted">
                  Your booking is sent to the {activeChapter.city} chapter admin
                  and the lab desk. We&rsquo;ll confirm your slot by email or
                  phone — drop samples after that.
                </p>
              </div>
              <ChapterPicker
                chapters={chapters}
                value={activeChapter.slug}
                basePath="/lab/book"
                label="Lab to book"
              />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
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
                  The {activeChapter.city} lab desk will reach out to confirm.{" "}
                  <Link
                    href={`/lab/book?chapter=${activeChapter.slug}`}
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

          {/* Signed-in chip */}
          <div className="mb-6 flex items-center gap-3 rounded-sm border border-border bg-surface px-4 py-3 text-xs">
            <CheckCircle2
              className="h-4 w-4 text-emerald-700"
              strokeWidth={1.75}
            />
            <span className="text-muted">
              Booking as{" "}
              <span className="font-semibold text-heading">
                {memberRow?.name ?? member.name}
              </span>
              {memberRow?.company && <> &middot; {memberRow.company}</>}
            </span>
          </div>

          <Card>
            <form action={submitStateBooking} className="space-y-6">
              <input type="hidden" name="chapter_slug" value={activeChapter.slug} />

              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Your name" htmlFor="name" required>
                  <Input
                    id="name"
                    name="name"
                    required
                    defaultValue={memberRow?.name ?? member.name ?? ""}
                    autoComplete="name"
                  />
                </Field>
                <Field
                  label="Company"
                  htmlFor="company"
                  hint="Locked to your account. Contact your chapter admin to change it."
                >
                  {/*
                   * Company comes from the member's profile and stays
                   * uneditable here — bookings have to be traceable back to
                   * a single firm. The hidden input ensures the form still
                   * submits the value; the visible input is disabled so the
                   * user can see it but can't tamper with it.
                   */}
                  <Input
                    id="company"
                    value={memberRow?.company ?? ""}
                    disabled
                    readOnly
                    aria-readonly="true"
                    className="cursor-not-allowed bg-surface text-muted"
                  />
                  <input
                    type="hidden"
                    name="company"
                    value={memberRow?.company ?? ""}
                  />
                </Field>
                <Field label="Email" htmlFor="email">
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    defaultValue={memberRow?.email ?? member.email ?? ""}
                    autoComplete="email"
                  />
                </Field>
                <Field label="Phone" htmlFor="phone">
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    defaultValue={memberRow?.phone ?? ""}
                    autoComplete="tel"
                  />
                </Field>
              </div>

              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                  Tests to run
                </div>
                <p className="mt-1 text-xs text-muted">Pick one or more.</p>
                {categoryKeys.length === 0 ? (
                  <div className="mt-4 rounded-sm border border-border bg-surface p-4 text-sm text-muted">
                    No tests listed for {activeChapter.city} yet. Contact the
                    lab desk directly or pick a different chapter.
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
                              key={t.code}
                              className="flex cursor-pointer items-start gap-2 rounded-sm border border-border bg-bg px-3 py-2.5 text-sm hover:border-rule hover:bg-surface"
                            >
                              <input
                                type="checkbox"
                                name="tests"
                                value={t.code}
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
                                  {t.turnaround_days != null &&
                                    ` · TAT ${t.turnaround_days}d`}
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

              <div className="grid gap-5 md:grid-cols-3">
                <Field label="Sample count" htmlFor="sample_count">
                  <Input
                    id="sample_count"
                    name="sample_count"
                    type="number"
                    min="1"
                    placeholder="1"
                  />
                </Field>
                <Field label="Preferred drop-off" htmlFor="preferred_date">
                  <Input
                    id="preferred_date"
                    name="preferred_date"
                    type="date"
                  />
                </Field>
                <Field label="Time slot" htmlFor="preferred_time">
                  {/*
                   * Static slot list keyed off the chapter's standard
                   * weekday hours. We deliberately don't pre-check
                   * availability live — the lab desk confirms by email
                   * and can shift the slot if needed.
                   */}
                  <select
                    id="preferred_time"
                    name="preferred_time"
                    defaultValue=""
                    className="block h-10 w-full rounded-sm border border-border bg-bg px-3 text-sm focus-visible:border-heading focus-visible:outline-none"
                  >
                    <option value="">Pick a slot</option>
                    <option value="10:00–11:00">10:00 – 11:00</option>
                    <option value="11:00–12:00">11:00 – 12:00</option>
                    <option value="12:00–13:00">12:00 – 13:00</option>
                    <option value="14:00–15:00">14:00 – 15:00</option>
                    <option value="15:00–16:00">15:00 – 16:00</option>
                    <option value="16:00–17:00">16:00 – 17:00</option>
                    <option value="17:00–18:00">17:00 – 18:00</option>
                  </select>
                </Field>
              </div>

              <Field label="Notes (optional)" htmlFor="notes">
                <textarea
                  id="notes"
                  name="notes"
                  rows={4}
                  className="w-full rounded-sm border border-border bg-bg px-3 py-2 text-sm focus-visible:border-heading focus-visible:outline-none"
                  placeholder="Sample description, special handling…"
                />
              </Field>

              <div className="flex justify-end border-t border-border pt-6">
                <Button type="submit">Submit booking</Button>
              </div>
            </form>
          </Card>
        </section>
      </main>
    </StateShell>
  );
}

function SignInGate({ slug }: { slug?: string }) {
  const next = encodeURIComponent(
    "/lab/book" + (slug ? `?chapter=${slug}` : ""),
  );
  return (
    <main className="mx-auto max-w-2xl px-6 py-20 lg:px-8">
      <div className="rounded-sm border border-border bg-surface p-8 text-center">
        <LogIn className="mx-auto h-8 w-8 text-muted" strokeWidth={1.5} />
        <h1 className="mt-4 !text-2xl !tracking-tight">Sign in to book a test.</h1>
        <p className="mt-3 text-sm text-muted">
          Lab bookings are reserved for UPCBMA members. Sign in with your
          member account and your booking will be sent to the chapter admin
          and lab desk.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href={`/login?next=${next}`}
            className="inline-flex h-11 items-center rounded-sm bg-heading px-5 text-sm font-medium text-white no-underline hover:bg-hover"
          >
            <LogIn className="mr-2 h-4 w-4" strokeWidth={2} />
            Sign in
          </Link>
          <Link
            href="/join"
            className="inline-flex h-11 items-center rounded-sm border border-rule bg-bg px-5 text-sm font-medium text-heading no-underline hover:border-heading hover:bg-surface"
          >
            Join UPCBMA
          </Link>
        </div>
        <p className="mt-6 text-xs text-muted">
          Not a member? You can still browse the catalogue — the chapter lab
          desk will accept walk-ins by phone.
        </p>
      </div>
    </main>
  );
}
