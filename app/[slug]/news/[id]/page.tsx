import { redirect } from "next/navigation";

/**
 * Individual news posts now live at /news/<id>. Old chapter-scoped URLs
 * bounce there for permalink stability.
 */
export default async function ChapterNewsDetailRedirect({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { id } = await params;
  redirect(`/news/${id}`);
}
