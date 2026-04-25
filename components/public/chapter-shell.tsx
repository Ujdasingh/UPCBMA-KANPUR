import { ChapterNav } from "./chapter-nav";
import { ChapterFooter } from "./chapter-footer";
import type { Chapter } from "@/lib/chapters";
import { resolveChapterLogo } from "@/lib/site-settings";

/**
 * Wraps every chapter-scoped public page with a chapter-aware nav, footer,
 * accent colour override, and a resolved logo URL (chapter logo if set,
 * else state logo, else bundled fallback).
 */
export async function ChapterShell({
  chapter,
  children,
}: {
  chapter: Chapter;
  children: React.ReactNode;
}) {
  const logoSrc = await resolveChapterLogo(chapter.logo_url);

  const style = chapter.accent_color
    ? ({
        ["--color-heading" as string]: chapter.accent_color,
        ["--color-hover" as string]: chapter.accent_color,
      } as React.CSSProperties)
    : undefined;

  return (
    <div style={style} data-chapter={chapter.slug}>
      <ChapterNav chapter={chapter} logoSrc={logoSrc} />
      <div className="min-h-[calc(100vh-4rem)]">{children}</div>
      {/* @ts-expect-error Server Component */}
      <ChapterFooter chapter={chapter} logoSrc={logoSrc} />
    </div>
  );
}
