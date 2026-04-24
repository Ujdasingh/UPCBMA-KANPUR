import { PageHeader } from "@/components/admin/page-header";
import { createClient } from "@/lib/supabase/server";
import { BookingsTable } from "./bookings-table";

export const dynamic = "force-dynamic";
export const metadata = { title: "Bookings — UPCBMA Admin" };

export default async function BookingsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .order("submitted_at", { ascending: false });

  if (error) {
    return (
      <>
        <PageHeader title="Bookings" />
        <p className="text-sm text-danger">
          Failed to load bookings: {error.message}
        </p>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Bookings"
        description="Lab booking requests from members. Triage by status."
      />
      <BookingsTable rows={data ?? []} />
    </>
  );
}
