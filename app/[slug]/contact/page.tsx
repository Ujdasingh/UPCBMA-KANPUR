import { redirect } from "next/navigation";

/**
 * Contact + Raise-a-problem are now sections of the consolidated chapter page.
 * The form lives at #raise-problem and chapter office details at #contact.
 */
export default async function ChapterContactRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/${slug}#contact`);
}
