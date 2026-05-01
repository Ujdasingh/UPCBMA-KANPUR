import { redirect } from "next/navigation";

/**
 * Lab is now state-wide with a chapter dropdown filter.
 * Old chapter URL bounces to the state /lab page pre-filtered to this chapter.
 */
export default async function ChapterLabRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/lab?chapter=${slug}`);
}
