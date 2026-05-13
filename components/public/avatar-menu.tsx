"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  Home,
  KeyRound,
  LogOut,
  ShieldCheck,
  User,
  UserCog,
} from "lucide-react";
import { Avatar } from "./avatar";
import { signOut } from "@/app/admin/actions";

/**
 * Top-right avatar dropdown — appears in the desktop nav when the visitor is
 * signed in. Mirrors the Gmail / Twitter / GitHub pattern: tap the avatar to
 * reveal an account menu with profile, settings, and sign-out shortcuts.
 *
 * Renders nothing (returns null) when there's no member — the parent shows
 * a "Sign in" button instead. This component is purely presentational; the
 * server shell decides which to render based on the auth lookup.
 */
export function AvatarMenu({
  name,
  email,
  photoUrl,
  isAdmin,
  tierLabel,
}: {
  name: string;
  email: string;
  photoUrl?: string | null;
  isAdmin: boolean;
  /** Resolved tier — e.g. "Tier 3 · Chapter Admin · Kanpur". Hidden when null. */
  tierLabel?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);

  // Close when route changes — feels broken otherwise.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Close on Escape only — explicit user intent. We deliberately do NOT
  // close on outside-click anymore: the panel holds your account info
  // and tier/role badge, and accidental dismissal while moving the
  // cursor to read it was the top usability complaint. Re-clicking the
  // avatar toggles it shut; tapping any of the inner links navigates
  // and closes via the route-change effect above.
  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);
  // ref is now only used for the wrapper; click-outside logic was removed.
  void ref;

  return (
    <div ref={ref} className="relative ml-2">
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="inline-flex h-10 items-center gap-1.5 rounded-full border border-border bg-bg px-1.5 text-sm transition-colors hover:border-heading"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
      >
        <Avatar name={name} src={photoUrl} size="sm" />
        <ChevronDown
          className={
            "h-3.5 w-3.5 text-muted transition-transform " +
            (open ? "rotate-180" : "")
          }
          strokeWidth={2}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-sm border border-border bg-bg shadow-lg"
        >
          <div className="border-b border-border px-4 py-3">
            <div className="flex items-center gap-3">
              <Avatar name={name} src={photoUrl} size="md" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-heading">
                  {name}
                </div>
                <div className="truncate text-xs text-muted">{email}</div>
              </div>
            </div>
            {/* Tier chip — the live "what am I?" indicator. Colour-coded so
                you can recognise your seat at a glance: Tier 1/2 are
                power-roles (amber), Tier 3 is chapter-scoped (emerald),
                Tier 4 is plain (surface). */}
            {tierLabel && (
              <div
                className={
                  "mt-2.5 inline-flex max-w-full items-center rounded-sm border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] " +
                  tierTone(tierLabel)
                }
                title={tierLabel}
              >
                <span className="truncate">{tierLabel}</span>
              </div>
            )}
          </div>

          <ul className="py-1 text-sm">
            <MenuItem href="/" Icon={Home} label="Visit website" />
            <MenuItem href="/me" Icon={User} label="My account" />
            <MenuItem href="/me/profile" Icon={UserCog} label="Edit profile" />
            <MenuItem
              href="/me/change-password"
              Icon={KeyRound}
              label="Change password"
            />
            {isAdmin && (
              <MenuItem
                href="/admin"
                Icon={ShieldCheck}
                label="Admin panel"
                primary
              />
            )}
          </ul>

          <form
            action={signOut}
            className="border-t border-border px-1 py-1"
          >
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-sm text-text transition-colors hover:bg-surface hover:text-heading"
            >
              <LogOut className="h-4 w-4 text-muted" strokeWidth={1.75} />
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

/**
 * Map the tier label to a colour scheme. Amber = power (Tier 1/2),
 * emerald = chapter (Tier 3), surface = plain (Tier 4). Matches the
 * news/agendas chapter-badge colours so the user's mental model stays
 * consistent across the site.
 */
function tierTone(label: string): string {
  if (label.startsWith("Tier 1") || label.startsWith("Tier 2")) {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }
  if (label.startsWith("Tier 3")) {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }
  return "border-border bg-surface text-muted";
}

function MenuItem({
  href,
  Icon,
  label,
  primary,
}: {
  href: string;
  Icon: typeof User;
  label: string;
  primary?: boolean;
}) {
  return (
    <li>
      <Link
        href={href}
        className={
          "flex items-center gap-2 px-4 py-2 no-underline transition-colors " +
          (primary
            ? "font-semibold text-heading hover:bg-surface"
            : "text-text hover:bg-surface hover:text-heading")
        }
      >
        <Icon
          className={"h-4 w-4 " + (primary ? "text-heading" : "text-muted")}
          strokeWidth={1.75}
        />
        {label}
      </Link>
    </li>
  );
}
