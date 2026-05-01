"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/public/logo";

/**
 * Responsive admin shell.
 *
 * Desktop (≥ md):  fixed 260px sidebar + main grid (the original layout).
 * Mobile (< md):   sticky top bar with a hamburger that slides in a drawer.
 *                  The drawer auto-closes when the user taps a link (we watch
 *                  pathname and reset state) — so navigation feels native.
 *
 * Why client-side: the drawer needs `useState` for open/closed and `usePathname`
 * to auto-close on route change. The static sidebar contents are passed in as
 * `sidebarContent` so the parent (a Server Component) can keep doing data
 * fetches with `getAdminContext()`.
 */
export function AdminShell({
  sidebarContent,
  banners,
  children,
}: {
  sidebarContent: React.ReactNode;
  banners?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close the drawer whenever the route changes — admins expect a tap on a
  // sidebar item to take them there AND tuck the drawer away.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll while the drawer is open so the drawer feels like a
  // separate surface rather than a panel sliding over scrollable content.
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="min-h-screen md:grid md:grid-cols-[260px_1fr]">
      {/* ----------------------- Mobile top bar ----------------------- */}
      <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-bg px-4 md:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="flex h-9 w-9 items-center justify-center rounded-sm border border-border text-heading transition-colors hover:bg-surface"
        >
          <Menu className="h-5 w-5" strokeWidth={1.75} />
        </button>
        <div className="flex items-center gap-2">
          <Logo size={24} />
          <div>
            <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted">
              UPCBMA
            </div>
            <div className="-mt-0.5 text-sm font-semibold text-heading">
              Admin
            </div>
          </div>
        </div>
      </div>

      {/* ----------------------- Mobile drawer ------------------------ */}
      {open && (
        <div
          className="fixed inset-0 z-50 md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Admin navigation"
        >
          {/* Backdrop — tap to dismiss */}
          <button
            type="button"
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            tabIndex={-1}
          />
          <aside className="absolute left-0 top-0 flex h-full w-[280px] flex-col overflow-y-auto border-r border-border bg-bg p-4 shadow-2xl">
            {/* Close button */}
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="mb-4 ml-auto flex h-8 w-8 items-center justify-center rounded-sm border border-border text-heading transition-colors hover:bg-surface"
            >
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* ----------------------- Desktop sidebar ---------------------- */}
      <aside className="hidden border-r border-border bg-bg p-4 md:flex md:min-h-screen md:flex-col">
        {sidebarContent}
      </aside>

      {/* ----------------------- Main column -------------------------- */}
      <main className="overflow-x-hidden bg-bg">
        {banners}
        <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
          {children}
        </div>
      </main>
    </div>
  );
}
