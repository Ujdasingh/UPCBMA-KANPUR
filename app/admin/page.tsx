import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/admin/page-header";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Stat = {
  label: string;
  value: string | number;
  hint?: string;
};

async function fetchStats(): Promise<Stat[]> {
  const supabase = await createClient();

  // Run every count in parallel. `head: true, count: 'exact'` returns the count
  // without actually pulling any rows — fast even on big tables.
  const [
    membersActive,
    apptActive,
    bookingsPending,
    messagesNew,
    newsTotal,
    eventsUpcoming,
    labTestsActive,
  ] = await Promise.all([
    supabase
      .from("members")
      .select("*", { head: true, count: "exact" })
      .eq("active", true),
    supabase
      .from("committee_appointments")
      .select("*", { head: true, count: "exact" })
      .eq("status", "active"),
    supabase
      .from("bookings")
      .select("*", { head: true, count: "exact" })
      .eq("status", "pending"),
    supabase
      .from("contact_messages")
      .select("*", { head: true, count: "exact" })
      .eq("status", "new"),
    supabase.from("news").select("*", { head: true, count: "exact" }),
    supabase
      .from("events")
      .select("*", { head: true, count: "exact" })
      .gte("event_date", new Date().toISOString().slice(0, 10)),
    supabase
      .from("lab_tests_catalog")
      .select("*", { head: true, count: "exact" })
      .eq("active", true),
  ]);

  return [
    {
      label: "Active members",
      value: membersActive.count ?? 0,
      hint: "On the roster",
    },
    {
      label: "Committee seats",
      value: apptActive.count ?? 0,
      hint: "Currently held",
    },
    {
      label: "Bookings pending",
      value: bookingsPending.count ?? 0,
      hint: "Awaiting confirmation",
    },
    {
      label: "Unread messages",
      value: messagesNew.count ?? 0,
      hint: "From contact form",
    },
    {
      label: "News items",
      value: newsTotal.count ?? 0,
      hint: "Published to date",
    },
    {
      label: "Upcoming events",
      value: eventsUpcoming.count ?? 0,
      hint: "From today forward",
    },
    {
      label: "Active lab tests",
      value: labTestsActive.count ?? 0,
      hint: "In catalog",
    },
  ];
}

export default async function DashboardPage() {
  const stats = await fetchStats();

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Live snapshot of UPCBMA Kanpur data."
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
              {s.label}
            </div>
            <div className="mt-2 text-3xl font-semibold text-heading tabular-nums">
              {s.value}
            </div>
            {s.hint && (
              <div className="mt-1 text-xs text-muted">{s.hint}</div>
            )}
          </Card>
        ))}
      </div>
    </>
  );
}
