import { PageHeader } from "@/components/admin/page-header";
import { createServiceClient } from "@/lib/supabase/server";
import { getAdminContext } from "@/lib/auth";
import { NewsTable } from "./news-table";

export const dynamic = "force-dynamic";
export const metadata = { title: "News — UPCBMA Admin" };

export default async function NewsPage() {
  const ctx = await getAdminContext();
  const svc = createServiceClient();

  // News.chapter_id is nullable. NULL = state-wide. In chapter view, show
  // state-wide + that chapter's posts. In All-chapters view, show everything.
  let query = svc.from("news").select("*").order("published_date", { ascending: false });

  if (ctx.activeChapterId) {
    query = query.or(`chapter_id.eq.${ctx.activeChapterId},chapter_id.is.null`);
  }

  const { data, error } = await query;

  if (error) {
    return (
      <>
        <PageHeader title="News" />
        <p className="text-sm text-danger">
          Failed to load news: {error.message}
        </p>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={
          ctx.activeChapter
            ? `News · ${ctx.activeChapter.name}`
            : "News · All chapters"
        }
        description={
          ctx.activeChapter
            ? `Posts for ${ctx.activeChapter.name} and state-wide announcements.`
            : "Every post across every chapter plus state-wide announcements."
        }
      />
      <NewsTable rows={data ?? []} />
    </>
  );
}
