import { redirect } from "next/navigation";

/**
 * News is now state-wide with a chapter dropdown filter.
 * Visiting /<chapter>/news bounces to the state /news page pre-filtered
 * to that chapter so the URL stays meaningful.
 */
export default async function ChapterNewsRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/news?chapter=${slug}`);
}
