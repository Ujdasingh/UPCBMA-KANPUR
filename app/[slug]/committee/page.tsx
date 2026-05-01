import { redirect } from "next/navigation";

/**
 * Committee is now a section of the consolidated chapter page (#committee).
 * Old direct links bounce there to keep the IA flat — one rich page per chapter.
 */
export default async function ChapterCommitteeRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/${slug}#committee`);
}
