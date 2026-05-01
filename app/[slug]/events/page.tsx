import { redirect } from "next/navigation";

/**
 * Events are now state-wide with a chapter dropdown filter.
 * Old chapter URL bounces to the state /events page pre-filtered.
 */
export default async function ChapterEventsRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/events?chapter=${slug}`);
}
