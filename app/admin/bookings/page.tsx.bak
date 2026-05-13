import { PageHeader } from "@/components/admin/page-header";
import { createServiceClient } from "@/lib/supabase/server";
import { getAdminContext } from "@/lib/auth";
import { BookingsTable } from "./bookings-table";

export const dynamic = "force-dynamic";
export const metadata = { title: "Bookings — UPCBMA Admin" };

export default async function BookingsPage() {
  const ctx = await getAdminContext();
  const svc = createServiceClient();

  let query = svc
    .from("bookings")
    .select("*")
    .order("submitted_at", { ascending: false });

  if (ctx.activeChapterId) {
    query = query.eq("chapter_id", ctx.activeChapterId);
  }

  const { data, error } = await query;

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
        title={
          ctx.activeChapter
            ? `Bookings · ${ctx.activeChapter.name}`
            : "Bookings · All chapters"
        }
        description={
          ctx.activeChapter
            ? `Lab bookings at ${ctx.activeChapter.name}'s lab. Triage by status.`
            : "Every chapter's lab bookings. Switch to a specific chapter to focus on its queue."
        }
      />
      <BookingsTable rows={data ?? []} />
    </>
  );
}
