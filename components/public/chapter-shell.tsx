import { ChapterNav } from "./chapter-nav";
import { ChapterFooter } from "./chapter-footer";
import type { Chapter } from "@/lib/chapters";

/**
 * Wraps every chapter-scoped public page with a chapter-aware nav, footer,
 * and an inline CSS variable override so the chapter's accent_color
 * (if set) tints the page's heading + primary buttons.
 */
export function ChapterShell({
  chapter,
  children,
}: {
  chapter: Chapter;
  children: React.ReactNode;
}) {
  // Per-chapter theming: if accent_color is set on the chapters row, override
  // --color-heading + --color-hover for this subtree only. Falls back to
  // global tokens otherwise (Modern Minimalist defaults).
  const style = chapter.accent_color
    ? ({
        ["--color-heading" as string]: chapter.accent_color,
        ["--color-hover" as string]: chapter.accent_color,
      } as React.CSSProperties)
    : undefined;

  return (
    <div style={style} data-chapter={chapter.slug}>
      <ChapterNav chapter={chapter} />
      <div className="min-h-[calc(100vh-4rem)]">{children}</div>
      {/* @ts-expect-error Server Component */}
      <ChapterFooter chapter={chapter} />
    </div>
  );
}
