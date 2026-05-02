"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, FlaskConical, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Hover/click-triggered "Lab" nav item with a chapter picker built in.
 *
 * Why: from anywhere on the site we want a one-step path to "go book a
 * test at <city>." The plain link to /lab forces an extra page and a
 * dropdown selection. This menu collapses that into a single hover.
 *
 * Accessibility:
 *   - The button is the keyboard handle. Enter/Space toggles open.
 *   - Hover opens for desktop pointer users.
 *   - Outside-click and Escape both close.
 *   - Each menu item is a real <Link>, so right-click / ⌘+click work.
 */
export type ChapterPick = {
  slug: string;
  name: string;
  city: string;
};

export function NavLabDropdown({
  chapters,
  activeSlug,
  isActive,
  className,
}: {
  chapters: ChapterPick[];
  /** Currently scoped chapter (so it's marked in the menu). */
  activeSlug?: string;
  /** Whether the user is currently on a /lab* route — drives nav highlight. */
  isActive?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close on outside click + Escape.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  // Hover-with-grace-period: lets the cursor cross the small gap between
  // the trigger and the panel without flickering shut.
  const hoverOpen = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const hoverClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  };

  return (
    <div
      ref={ref}
      onMouseEnter={hoverOpen}
      onMouseLeave={hoverClose}
      className={cn("relative", className)}
    >
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          "inline-flex items-center gap-1 rounded-sm px-3 py-2 text-sm transition-colors",
          isActive
            ? "text-heading font-semibold"
            : "text-text hover:text-heading",
        )}
      >
        Lab
        <ChevronDown
          className={cn(
            "h-3 w-3 text-muted transition-transform",
            open && "rotate-180",
          )}
          strokeWidth={2}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-1/2 top-full z-50 mt-1 w-[320px] -translate-x-1/2 overflow-hidden rounded-sm border border-border bg-bg shadow-lg"
        >
          <div className="border-b border-border bg-surface px-4 py-2.5">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
              <FlaskConical className="h-3 w-3" strokeWidth={2} />
              Pick a lab
            </div>
            <p className="mt-0.5 text-xs text-muted">
              Jump straight to booking at any chapter.
            </p>
          </div>

          <ul className="max-h-[60vh] overflow-y-auto py-1">
            {chapters.length === 0 ? (
              <li className="px-4 py-3 text-xs text-muted">
                No active chapters yet.
              </li>
            ) : (
              chapters.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/lab/book?chapter=${c.slug}`}
                    className={cn(
                      "flex items-start gap-3 px-4 py-2.5 no-underline transition-colors hover:bg-surface",
                      activeSlug === c.slug && "bg-surface",
                    )}
                  >
                    <MapPin
                      className="mt-0.5 h-4 w-4 shrink-0 text-muted"
                      strokeWidth={1.75}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-heading">
                        {c.name}
                      </div>
                      <div className="truncate text-xs text-muted">
                        Book at {c.city}
                      </div>
                    </div>
                  </Link>
                </li>
              ))
            )}
          </ul>

          <div className="border-t border-border bg-surface px-4 py-2.5 text-xs">
            <Link
              href="/lab"
              className="font-medium text-heading no-underline hover:underline"
            >
              View full lab catalogue →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
