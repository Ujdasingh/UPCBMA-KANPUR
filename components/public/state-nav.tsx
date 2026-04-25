"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X, LogIn } from "lucide-react";
import { Logo } from "./logo";

const links = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/chapters", label: "Chapters" },
  { href: "/news", label: "News" },
  { href: "/events", label: "Events" },
  { href: "/contact", label: "Contact" },
];

export function StateNav() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full bg-bg/95 backdrop-blur-sm transition-shadow",
        scrolled
          ? "border-b border-border shadow-sm"
          : "border-b border-transparent",
      )}
    >
      {/* Slim accent strip on top — gives the header a confident edge */}
      <div className="h-[3px] w-full bg-gradient-to-r from-[#dca135] via-[#0d6b3e] to-[#dca135]" />

      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="group inline-flex items-center gap-2.5 no-underline">
          <Logo size={32} />
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted group-hover:text-heading">
              Uttar Pradesh
            </div>
            <div className="-mt-0.5 text-sm font-semibold text-heading">
              UPCBMA
            </div>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {links.map(({ href, label }) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "rounded-sm px-3 py-2 text-sm no-underline transition-colors",
                  active
                    ? "text-heading font-semibold"
                    : "text-text hover:text-heading",
                )}
              >
                {label}
              </Link>
            );
          })}
          <Link
            href="/login"
            className="ml-3 inline-flex h-9 items-center gap-1.5 rounded-sm border border-border px-3 text-sm font-medium text-heading no-underline hover:border-heading hover:bg-surface"
          >
            <LogIn className="h-3.5 w-3.5" strokeWidth={2} />
            Sign in
          </Link>
          <Link
            href="/chapters"
            className="ml-1 inline-flex h-9 items-center rounded-sm bg-heading px-4 text-sm font-medium text-white no-underline hover:bg-hover"
          >
            Find your chapter
          </Link>
        </nav>

        <button
          type="button"
          aria-label={open ? "Close" : "Open"}
          className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-sm border border-border text-heading"
          onClick={() => setOpen((s) => !s)}
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {open && (
        <nav className="md:hidden border-t border-border bg-bg">
          <div className="mx-auto flex max-w-6xl flex-col px-4 py-3">
            {links.map(({ href, label }) => {
              const active =
                href === "/" ? pathname === "/" : pathname.startsWith(href);
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
              href="/login"
              className="mt-2 inline-flex h-10 items-center justify-center gap-1.5 rounded-sm border border-border px-3 text-sm font-medium text-heading no-underline"
            >
              <LogIn className="h-3.5 w-3.5" strokeWidth={2} />
              Sign in
            </Link>
            <Link
              href="/chapters"
              className="mt-2 inline-flex h-10 items-center justify-center rounded-sm bg-heading px-4 text-sm font-medium text-white no-underline"
            >
              Find your chapter
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
