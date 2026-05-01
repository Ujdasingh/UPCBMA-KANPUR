"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X, UserPlus } from "lucide-react";
import { Logo } from "./logo";
import { LoginButton } from "./login-dialog";
import { AvatarMenu } from "./avatar-menu";

export type NavMember = {
  name: string;
  email: string;
  photoUrl?: string | null;
  isAdmin: boolean;
} | null;

const links = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/chapters", label: "Chapters" },
  { href: "/agendas", label: "Agendas" },
  { href: "/news", label: "News" },
  { href: "/events", label: "Events" },
  { href: "/contact", label: "Contact" },
];

export function StateNav({
  logoSrc,
  member,
}: {
  logoSrc?: string;
  /** When set, the top-right shows an avatar dropdown instead of "Sign in". */
  member?: NavMember;
}) {
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

      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:h-20 sm:px-6 lg:px-8">
        <Link href="/" className="group inline-flex items-center gap-2 no-underline sm:gap-3">
          <Logo size={56} src={logoSrc} />
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted group-hover:text-heading">
              Uttar Pradesh
            </div>
            <div className="-mt-0.5 text-base font-semibold text-heading">
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
          {member ? (
            <AvatarMenu
              name={member.name}
              email={member.email}
              photoUrl={member.photoUrl}
              isAdmin={member.isAdmin}
            />
          ) : (
            <>
              <LoginButton className="ml-3" logoSrc={logoSrc} />
              <Link
                href="/join"
                className="ml-1 inline-flex h-9 items-center gap-1.5 rounded-sm bg-heading px-4 text-sm font-medium text-white no-underline hover:bg-hover"
              >
                <UserPlus className="h-3.5 w-3.5" strokeWidth={2} />
                Join UPCBMA
              </Link>
            </>
          )}
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
          <div className="mx-auto flex max-w-7xl flex-col px-4 py-3">
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
            {member ? (
              <Link
                href="/me"
                className="mt-2 inline-flex h-10 items-center justify-center gap-2 rounded-sm border border-border px-4 text-sm font-medium text-heading no-underline"
              >
                Account · {member.name.split(" ")[0]}
              </Link>
            ) : (
              <>
                <div className="mt-2">
                  <LoginButton className="w-full" logoSrc={logoSrc} />
                </div>
                <Link
                  href="/join"
                  className="mt-2 inline-flex h-10 items-center justify-center gap-1.5 rounded-sm bg-heading px-4 text-sm font-medium text-white no-underline"
                >
                  <UserPlus className="h-3.5 w-3.5" strokeWidth={2} />
                  Join UPCBMA
                </Link>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
