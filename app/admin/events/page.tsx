import { PageHeader } from "@/components/admin/page-header";
import { createServiceClient } from "@/lib/supabase/server";
import { getAdminContext } from "@/lib/auth";
import { EventsTable } from "./events-table";

export const dynamic = "force-dynamic";
export const metadata = { title: "Events — UPCBMA Admin" };

export default async function EventsPage() {
  const ctx = await getAdminContext();
  const svc = createServiceClient();

  let query = svc
    .from("events")
    .select("*")
    .order("event_date", { ascending: true, nullsFirst: false });

  if (ctx.activeChapterId) {
    query = query.or(`chapter_id.eq.${ctx.activeChapterId},chapter_id.is.null`);
  }

  const { data, error } = await query;

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
        title={
          ctx.activeChapter
            ? `Events · ${ctx.activeChapter.name}`
            : "Events · All chapters"
        }
        description={
          ctx.activeChapter
            ? `Meets and fixtures for ${ctx.activeChapter.name} plus state-wide events.`
            : "Every event across every chapter and state-wide fixtures."
        }
      />
      <EventsTable rows={data ?? []} />
    </>
  );
}
