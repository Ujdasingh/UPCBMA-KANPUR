import { PageHeader } from "@/components/admin/page-header";
import { createServiceClient } from "@/lib/supabase/server";
import { getAdminContext } from "@/lib/auth";
import { MessagesTable } from "./messages-table";

export const dynamic = "force-dynamic";
export const metadata = { title: "Messages — UPCBMA Admin" };

export default async function MessagesPage() {
  const ctx = await getAdminContext();
  const svc = createServiceClient();

  let query = svc
    .from("contact_messages")
    .select("*")
    .order("created_at", { ascending: false });

  if (ctx.activeChapterId) {
    query = query.or(
      `chapter_id.eq.${ctx.activeChapterId},chapter_id.is.null`,
    );
  }

  const { data, error } = await query;

  if (error) {
    return (
      <>
        <PageHeader title="Messages" />
        <p className="text-sm text-danger">
          Failed to load messages: {error.message}
        </p>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={
          ctx.activeChapter
            ? `Messages · ${ctx.activeChapter.name}`
            : "Messages · All chapters"
        }
        description={
          ctx.activeChapter
            ? `Contact form submissions addressed to ${ctx.activeChapter.name} plus unrouted (state) messages.`
            : "All contact form submissions across every chapter."
        }
      />
      <MessagesTable rows={data ?? []} />
    </>
  );
}
