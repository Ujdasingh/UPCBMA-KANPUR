"use client";

import { cn } from "@/lib/utils";
import type { Chapter } from "@/lib/chapters";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X, ArrowLeft } from "lucide-react";
import { Logo } from "./logo";
import { LoginButton } from "./login-dialog";
import { AvatarMenu } from "./avatar-menu";
import type { NavMember } from "./state-nav";
import { NavLabDropdown, type ChapterPick } from "./nav-lab-dropdown";

export function ChapterNav({
  chapter,
  logoSrc,
  member,
  chapters = [],
}: {
  chapter: Chapter;
  logoSrc?: string;
  member?: NavMember;
  /** All active chapters — drives the Lab hover dropdown. */
  chapters?: ChapterPick[];
}) {
  const base = `/${chapter.slug}`;
  // The chapter page is a single rich view. Anchor links jump within it for
  // chapter-scoped sections (committee, contact). Lab is a hover dropdown
  // letting visitors jump to any chapter's booking in one move.
  const links = [
    { href: base,                              label: "Home"      },
    { href: `${base}#committee`,               label: "Committee" },
    // Lab is rendered separately as a NavLabDropdown.
    { href: `/news?chapter=${chapter.slug}`,   label: "News"      },
    { href: `/events?chapter=${chapter.slug}`, label: "Events"    },
    { href: `${base}#contact`,                 label: "Contact"   },
  ];

  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setMobileOpen(false), [pathname]);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full bg-bg/95 backdrop-blur-sm transition-shadow",
        scrolled
          ? "border-b border-border shadow-sm"
          : "border-b border-transparent",
      )}
    >
      {/* Top utility strip — back link + chapter directory + sign-in */}
      <div className="border-b border-border/60 bg-surface">
        <div className="mx-auto flex h-9 max-w-7xl items-center justify-between gap-4 px-6 lg:px-8 text-xs">
          <Link href="/" className="inline-flex items-center gap-1 text-muted hover:text-heading no-underline">
            <ArrowLeft className="h-3 w-3" strokeWidth={2} />
            UPCBMA &mdash; state site
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/chapters" className="hidden sm:inline text-muted hover:text-heading no-underline">
              All chapters
            </Link>
            {member ? (
              <AvatarMenu
                name={member.name}
                email={member.email}
                photoUrl={member.photoUrl}
                isAdmin={member.isAdmin}
                tierLabel={member.tierLabel}
              />
            ) : (
              <LoginButton variant="ghost" logoSrc={logoSrc} />
            )}
          </div>
        </div>
      </div>

      {/* Slim accent strip — anchors the chapter to the parent UPCBMA brand */}
      <div className="h-[3px] w-full bg-gradient-to-r from-[#dca135] via-[#0d6b3e] to-[#dca135]" />

      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:h-20 sm:px-6 lg:px-8">
        {/* Logo always returns visitors to the website home (state /). The
            chapter wordmark next to it stays as a separate link to the chapter
            home so people who only want to stay inside this chapter still can. */}
        <div className="inline-flex items-center gap-3">
          <Link
            href="/"
            className="shrink-0 no-underline"
            aria-label="UPCBMA — back to website home"
          >
            <Logo size={56} src={logoSrc} />
          </Link>
          <Link href={base} className="group no-underline">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted group-hover:text-heading">
              {chapter.state}
            </div>
            <div className="-mt-0.5 text-base font-semibold text-heading">
              {chapter.name}
            </div>
          </Link>
        </div>

        <nav className="hidden md:flex items-center gap-1">
          {/* Insert "Home → Committee → Lab(▾) → News → Events → Contact" so
              Lab keeps its position even though it's a special dropdown. */}
          {links.slice(0, 2).map(({ href, label }) => {
            const active =
              href === base ? pathname === base : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "rounded-sm px-3 py-2 text-sm no-underline transition-colors",
                  active ? "text-heading font-semibold" : "text-text hover:text-heading",
                )}
              >
                {label}
              </Link>
            );
          })}
          <NavLabDropdown
            chapters={chapters}
            activeSlug={chapter.slug}
            isActive={pathname.startsWith("/lab")}
          />
          {links.slice(2).map(({ href, label }) => {
            const active =
              href === base ? pathname === base : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "rounded-sm px-3 py-2 text-sm no-underline transition-colors",
                  active ? "text-heading font-semibold" : "text-text hover:text-heading",
                )}
              >
                {label}
              </Link>
            );
          })}
          <Link
            href={`/lab/book?chapter=${chapter.slug}`}
            className="ml-3 inline-flex h-9 items-center rounded-sm bg-heading px-4 text-sm font-medium text-white no-underline hover:bg-hover"
          >
            Book a test
          </Link>
        </nav>

        <button
          type="button"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-sm border border-border text-heading"
          onClick={() => setMobileOpen((s) => !s)}
        >
          {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {mobileOpen && (
        <nav className="md:hidden border-t border-border bg-bg">
          <div className="mx-auto flex max-w-7xl flex-col px-4 py-3">
            {links.map(({ href, label }) => {
              const active =
                href === base ? pathname === base : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "rounded-sm px-3 py-3 text-sm no-underline",
                    active ? "bg-surface font-semibold text-heading" : "text-text hover:bg-surface",
                  )}
                >
                  {label}
                </Link>
              );
            })}
            {chapters.length > 0 && (
              <div className="mt-2 rounded-sm border border-border bg-surface p-2">
                <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
                  Lab — book at
                </div>
                {chapters.map((c) => (
                  <Link
                    key={c.slug}
                    href={`/lab/book?chapter=${c.slug}`}
                    className={cn(
                      "block rounded-sm px-2 py-2 text-sm no-underline hover:bg-bg",
                      c.slug === chapter.slug
                        ? "font-semibold text-heading"
                        : "text-text",
                    )}
                  >
                    {c.name}
                    <span className="ml-1 text-xs text-muted">· {c.city}</span>
                  </Link>
                ))}
                <Link
                  href={`/lab?chapter=${chapter.slug}`}
                  className="mt-1 block rounded-sm px-2 py-2 text-xs font-medium text-heading no-underline hover:bg-bg"
                >
                  View {chapter.city} catalogue →
                </Link>
              </div>
            )}
            <Link
              href={`/lab/book?chapter=${chapter.slug}`}
              className="mt-2 inline-flex h-10 items-center justify-center rounded-sm bg-heading px-4 text-sm font-medium text-white no-underline"
            >
              Book a test at {chapter.city}
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
