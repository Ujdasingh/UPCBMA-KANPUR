import { ChapterNav } from "./chapter-nav";
import { ChapterFooter } from "./chapter-footer";
import { MobileTabBar } from "./mobile-tab-bar";
import type { NavMember } from "./state-nav";
import type { Chapter } from "@/lib/chapters";
import { resolveChapterLogo } from "@/lib/site-settings";
import { getAuthedMember } from "@/lib/auth";

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
  const [logoSrc, me] = await Promise.all([
    resolveChapterLogo(chapter.logo_url),
    getAuthedMember(),
  ]);
  const signedIn = !!me;
  const navMember: NavMember = me
    ? {
        name: me.name,
        email: me.email,
        photoUrl: me.photo_url ?? null,
        isAdmin: me.role === "admin" || me.role === "super_admin",
      }
    : null;

  const style = chapter.accent_color
    ? ({
        ["--color-heading" as string]: chapter.accent_color,
        ["--color-hover" as string]: chapter.accent_color,
      } as React.CSSProperties)
    : undefined;

  return (
    <div style={style} data-chapter={chapter.slug}>
      <ChapterNav chapter={chapter} logoSrc={logoSrc} member={navMember} />
      <div className="min-h-[calc(100vh-4rem)] pb-16 md:pb-0">{children}</div>
      {/* @ts-expect-error Server Component */}
      <ChapterFooter chapter={chapter} logoSrc={logoSrc} />
      <MobileTabBar signedIn={signedIn} />
    </div>
  );
}
