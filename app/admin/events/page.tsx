import { PageHeader } from "@/components/admin/page-header";
import { createClient } from "@/lib/supabase/server";
import { EventsTable } from "./events-table";

export const dynamic = "force-dynamic";
export const metadata = { title: "Events — UPCBMA Admin" };

export default async function EventsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .order("event_date", { ascending: true, nullsFirst: false });

  if (error) {
    return (
      <>
        <PageHeader title="Events" />
        <p className="text-sm text-danger">
          Failed to load events: {error.message}
        </p>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Events"
        description="Meets, workshops, and recurring fixtures."
      />
      <EventsTable rows={data ?? []} />
    </>
  );
}
