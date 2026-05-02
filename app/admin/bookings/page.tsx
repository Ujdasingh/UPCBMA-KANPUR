import { PageHeader } from "@/components/admin/page-header";
import { createServiceClient } from "@/lib/supabase/server";
import { getAdminContext } from "@/lib/auth";
import { BookingsTable } from "./bookings-table";
import { BookingsSummary } from "./bookings-summary";

export const dynamic = "force-dynamic";
export const metadata = { title: "Bookings · Admin" };

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

  const chapterName = ctx.activeChapter?.name ?? "All chapters";

  return (
    <>
      {/* Print stylesheet: keep the report tight on paper, hide nav chrome
          and any "no-print" utilities (export buttons, status filter chips). */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          aside, header, footer, nav { display: none !important; }
          body { background: white !important; }
          .bookings-summary { page-break-inside: avoid; }
        }
      `}</style>
      <PageHeader
        title={
          ctx.activeChapter
            ? `Bookings · ${ctx.activeChapter.name}`
            : "Bookings · All chapters"
        }
        description={
          ctx.activeChapter
            ? `Lab bookings at ${ctx.activeChapter.name}'s lab. Triage by status, export to Excel, or save as PDF.`
            : "Every chapter's lab bookings. Switch to a specific chapter to focus its queue."
        }
      />
      <BookingsSummary rows={data ?? []} chapterName={chapterName} />
      <BookingsTable rows={data ?? []} />
    </>
  );
}
