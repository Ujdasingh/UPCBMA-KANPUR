"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

const links = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/committee", label: "Committee" },
  { href: "/lab", label: "Lab" },
  { href: "/news", label: "News" },
  { href: "/events", label: "Events" },
  { href: "/contact", label: "Contact" },
];

export function PublicNav() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => setMobileOpen(false), [pathname]);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full border-b bg-bg/85 backdrop-blur-sm transition-colors",
        scrolled ? "border-border" : "border-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        {/* Wordmark */}
        <Link href="/" className="group no-underline">
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted group-hover:text-heading transition-colors">
            UPCBMA
          </div>
          <div className="-mt-0.5 text-sm font-semibold text-heading">
            Kanpur Chapter
          </div>
        </Link>

        {/* Desktop nav */}
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
            href="/lab/book"
            className="ml-3 inline-flex h-9 items-center rounded-sm bg-heading px-4 text-sm font-medium text-white no-underline hover:bg-hover"
          >
            Book a test
          </Link>
        </nav>

        {/* Mobile toggle */}
        <button
          type="button"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-sm border border-border text-heading"
          onClick={() => setMobileOpen((s) => !s)}
        >
          {mobileOpen ? (
            <X className="h-4 w-4" />
          ) : (
            <Menu className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
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
                    active
                      ? "bg-surface font-semibold text-heading"
                      : "text-text hover:bg-surface",
                  )}
                >
                  {label}
                </Link>
              );
            })}
            <Link
              href="/lab/book"
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
