import { redirect } from "next/navigation";

/**
 * Lab booking is now login-gated and state-level (one form, chapter dropdown).
 * Old chapter URL bounces to /lab/book?chapter=<slug>.
 */
export default async function ChapterLabBookRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/lab/book?chapter=${slug}`);
}
