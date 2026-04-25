"use client";

import { cn } from "@/lib/utils";
import type { Chapter } from "@/lib/chapters";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X, ArrowLeft, LogIn } from "lucide-react";
import { Logo } from "./logo";

export function ChapterNav({
  chapter,
  logoSrc,
}: {
  chapter: Chapter;
  logoSrc?: string;
}) {
  const base = `/${chapter.slug}`;
  const links = [
    { href: base, label: "Home" },
    { href: `${base}/committee`, label: "Committee" },
    { href: `${base}/lab`, label: "Lab" },
    { href: `${base}/news`, label: "News" },
    { href: `${base}/events`, label: "Events" },
    { href: `${base}/contact`, label: "Contact" },
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
        <div className="mx-auto flex h-9 max-w-6xl items-center justify-between gap-4 px-6 text-xs">
          <Link href="/" className="inline-flex items-center gap-1 text-muted hover:text-heading no-underline">
            <ArrowLeft className="h-3 w-3" strokeWidth={2} />
            UPCBMA &mdash; state site
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/chapters" className="hidden sm:inline text-muted hover:text-heading no-underline">
              All chapters
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-1 text-muted hover:text-heading no-underline"
            >
              <LogIn className="h-3 w-3" strokeWidth={2} />
              Sign in
            </Link>
          </div>
        </div>
      </div>

      {/* Slim accent strip — anchors the chapter to the parent UPCBMA brand */}
      <div className="h-[3px] w-full bg-gradient-to-r from-[#dca135] via-[#0d6b3e] to-[#dca135]" />

      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href={base} className="group inline-flex items-center gap-2.5 no-underline">
          <Logo size={32} src={logoSrc} />
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted group-hover:text-heading">
              {chapter.state}
            </div>
            <div className="-mt-0.5 text-sm font-semibold text-heading">
              {chapter.name}
            </div>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {links.map(({ href, label }) => {
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
            href={`${base}/lab/book`}
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
          <div className="mx-auto flex max-w-6xl flex-col px-4 py-3">
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
            <Link
              href={`${base}/lab/book`}
              className="mt-2 inline-flex h-10 items-center justify-center rounded-sm bg-heading px-4 text-sm font-medium text-white no-underline"
            >
              Book a test
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
