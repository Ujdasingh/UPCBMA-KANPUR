import { ChapterNav } from "./chapter-nav";
import { ChapterFooter } from "./chapter-footer";
import type { Chapter } from "@/lib/chapters";

export function ChapterShell({
  chapter,
  children,
}: {
  chapter: Chapter;
  children: React.ReactNode;
}) {
  return (
    <>
      <ChapterNav chapter={chapter} />
      <div className="min-h-[calc(100vh-4rem)]">{children}</div>
      {/* @ts-expect-error Server Component */}
      <ChapterFooter chapter={chapter} />
    </>
  );
}
