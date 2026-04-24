import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PublicShell } from "@/components/public/shell";
import { FlaskConical, ArrowRight, Timer, IndianRupee } from "lucide-react";

export const metadata = {
  title: "Lab services — UPCBMA Kanpur Chapter",
  description:
    "Testing lab at the UPCBMA Kanpur Chapter — burst strength, bending, compression, cobb value, paper GSM and more. Member rates and turnaround times.",
};

export const revalidate = 300;

export default async function LabPage() {
  const supabase = await createClient();

  const [
    { data: tests },
    { data: office },
  ] = await Promise.all([
    supabase
      .from("lab_tests_catalog")
      .select("id, code, name, description, price_inr, tat_hours, category, sort_order")
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .order("code", { ascending: true }),
    supabase.from("office_info").select("*").eq("id", 1).maybeSingle(),
  ]);

  // Group tests by category
  const groups: Record<string, NonNullable<typeof tests>> = {};
  for (const t of tests ?? []) {
    const key = t.category ?? "Other";
    if (!groups[key]) groups[key] = [];
    groups[key]!.push(t);
  }
  const categoryKeys = Object.keys(groups).sort();

  return (
    <PublicShell>
      {/* Hero */}
      <section className="border-b border-border bg-surface">
        <div className="mx-auto max-w-3xl px-6 py-20">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
            Lab services
          </div>
          <h1 className="mt-3 !tracking-tight">
            In-house testing for members and non-members.
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-muted">
            The chapter runs a testing lab offering standard corrugated board
            and paper tests. Bookings are made online; samples are dropped at
            the lab desk during office hours. Results are delivered within the
            turnaround time (TAT) listed for each test.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/lab/book"
              className="inline-flex h-11 items-center rounded-sm bg-heading px-5 text-sm font-medium text-white no-underline hover:bg-hover"
            >
              Book a test
              <ArrowRight className="ml-2 h-4 w-4" strokeWidth={2} />
            </Link>
            {office?.lab_phone && (
              <a
                href={`tel:${office.lab_phone}`}
                className="inline-flex h-11 items-center rounded-sm border border-rule bg-bg px-5 text-sm font-medium text-heading no-underline hover:border-heading hover:bg-surface"
              >
                Call lab desk: {office.lab_phone}
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Lab desk info strip */}
      {(office?.lab_contact_name || office?.lab_hours || office?.lab_billing_model) && (
        <section className="border-b border-border">
          <div className="mx-auto grid max-w-6xl gap-6 px-6 py-8 md:grid-cols-3">
            {office?.lab_contact_name && (
              <InfoStrip
                label="Lab desk contact"
                value={
                  office.lab_contact_name +
                  (office.lab_contact_role ? " — " + office.lab_contact_role : "")
                }
              />
            )}
            {office?.lab_hours && (
              <InfoStrip label="Lab hours" value={office.lab_hours} />
            )}
            {office?.lab_billing_model && (
              <InfoStrip label="Billing" value={office.lab_billing_model} />
            )}
          </div>
        </section>
      )}

      {/* Catalog */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        {categoryKeys.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <FlaskConical className="h-8 w-8 text-muted" strokeWidth={1.5} />
            <h2 className="mt-4 !text-xl">Test catalog coming soon.</h2>
            <p className="mt-2 max-w-md text-sm text-muted">
              The lab&rsquo;s active test list will be published here. Contact
              the lab desk for current availability.
            </p>
          </div>
        ) : (
          <div className="space-y-16">
            {categoryKeys.map((cat) => {
              const list = groups[cat]!;
              return (
                <div key={cat}>
                  <div className="flex items-baseline justify-between border-b border-border pb-3">
                    <h2 className="!text-xl !tracking-tight">{cat}</h2>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                      {list.length} {list.length === 1 ? "test" : "tests"}
                    </div>
                  </div>

                  <div className="mt-6 divide-y divide-border">
                    {list.map((t) => (
                      <div
                        key={t.id}
                        className="flex flex-col gap-2 py-5 md:flex-row md:items-start md:justify-between md:gap-8"
                      >
                        <div className="flex-1">
                          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                            <code className="rounded-sm border border-border bg-surface px-1.5 py-0.5 font-mono text-[11px] text-muted">
                              {t.code}
                            </code>
                            <h3 className="text-base font-semibold text-heading">
                              {t.name}
                            </h3>
                          </div>
                          {t.description && (
                            <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-muted">
                              {t.description}
                            </p>
                          )}
                        </div>

                        <div className="flex shrink-0 gap-8 md:justify-end">
                          <Meta
                            Icon={IndianRupee}
                            label="Member rate"
                            value={
                              t.price_inr != null
                                ? t.price_inr.toLocaleString("en-IN")
                                : "On request"
                            }
                          />
                          <Meta
                            Icon={Timer}
                            label="TAT"
                            value={
                              t.tat_hours != null
                                ? `${t.tat_hours} hr`
                                : "On request"
                            }
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Bottom CTA */}
      <section className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-6 py-14 md:flex-row md:items-center">
          <div className="max-w-2xl">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
              Ready to test?
            </div>
            <h2 className="mt-2 !text-2xl !tracking-tight">
              Book a slot and drop your samples at the lab desk.
            </h2>
          </div>
          <Link
            href="/lab/book"
            className="inline-flex h-11 shrink-0 items-center rounded-sm bg-heading px-5 text-sm font-medium text-white no-underline hover:bg-hover"
          >
            Book a test
            <ArrowRight className="ml-2 h-4 w-4" strokeWidth={2} />
          </Link>
        </div>
      </section>
    </PublicShell>
  );
}

function InfoStrip({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
        {label}
      </div>
      <div className="mt-1 text-sm font-medium text-text">{value}</div>
    </div>
  );
}

function Meta({
  Icon,
  label,
  value,
}: {
  Icon: typeof Timer;
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
        <Icon className="h-3 w-3" strokeWidth={1.75} />
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-heading tabular-nums">
        {value}
      </div>
    </div>
  );
}
