"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Network, FlaskConical, User } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Bottom navigation bar for mobile — the single most impactful mobile UX
 * lever for content-heavy sites. Four destinations a regular member needs
 * one tap away:
 *
 *   • Home     — UPCBMA state landing
 *   • Chapters — directory of chapters (each is a one-page experience)
 *   • Lab      — book a test (login-gated landing for non-members)
 *   • Account  — /me when signed in, /login otherwise
 *
 * Hidden on md+ where the top nav already serves. Pinned to the viewport
 * bottom with safe-area inset for iOS notches.
 *
 * `signedIn` is passed from the server shell so the Account icon links to
 * the right destination without a client-side fetch.
 */
export function MobileTabBar({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();

  const items = [
    { href: "/", label: "Home", Icon: Home, match: (p: string) => p === "/" },
    {
      href: "/chapters",
      label: "Chapters",
      Icon: Network,
      match: (p: string) => p.startsWith("/chapters"),
    },
    {
      href: "/lab",
      label: "Lab",
      Icon: FlaskConical,
      match: (p: string) => p.startsWith("/lab"),
    },
    {
      href: signedIn ? "/me" : "/login",
      label: signedIn ? "Me" : "Sign in",
      Icon: User,
      match: (p: string) =>
        p.startsWith("/me") || p.startsWith("/login"),
    },
  ];

  return (
    <nav
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg/95 backdrop-blur-sm md:hidden",
        // Respect iOS home-bar safe area so the labels sit above it.
        "[padding-bottom:env(safe-area-inset-bottom)]",
      )}
      aria-label="Mobile navigation"
    >
      <ul className="grid grid-cols-4">
        {items.map(({ href, label, Icon, match }) => {
          const active = match(pathname);
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium no-underline transition-colors",
                  active
                    ? "text-heading"
                    : "text-muted hover:text-heading",
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5",
                    active ? "text-heading" : "text-muted",
                  )}
                  strokeWidth={active ? 2.25 : 1.75}
                  aria-hidden="true"
                />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
