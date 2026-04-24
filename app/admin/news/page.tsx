import { PageHeader } from "@/components/admin/page-header";
import { createClient } from "@/lib/supabase/server";
import { NewsTable } from "./news-table";

export const dynamic = "force-dynamic";
export const metadata = { title: "News — UPCBMA Admin" };

export default async function NewsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("news")
    .select("*")
    .order("published_date", { ascending: false });

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
        title="News"
        description="Announcements, notices, and updates for the home page."
      />
      <NewsTable rows={data ?? []} />
    </>
  );
}
