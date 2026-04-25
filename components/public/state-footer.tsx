import Link from "next/link";
import { Logo } from "./logo";

export function StateFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-20 bg-surface">
      {/* Top accent stripe — mirrors the header for symmetry */}
      <div className="h-[3px] w-full bg-gradient-to-r from-[#dca135] via-[#0d6b3e] to-[#dca135]" />

      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-2.5">
              <Logo size={36} />
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
                  Uttar Pradesh
                </div>
                <div className="mt-0.5 text-base font-semibold text-heading">UPCBMA</div>
              </div>
            </div>
            <p className="mt-4 max-w-sm text-sm text-muted">
              The Uttar Pradesh Corrugated Box Manufacturers&rsquo; Association
              &mdash; state body representing chapters across UP.
            </p>
          </div>

          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
              Explore
            </div>
            <ul className="mt-4 space-y-2 text-sm">
              <li><Link href="/about" className="no-underline text-text hover:text-heading">About UPCBMA</Link></li>
              <li><Link href="/chapters" className="no-underline text-text hover:text-heading">All chapters</Link></li>
              <li><Link href="/news" className="no-underline text-text hover:text-heading">State-wide news</Link></li>
              <li><Link href="/events" className="no-underline text-text hover:text-heading">State-wide events</Link></li>
              <li><Link href="/contact" className="no-underline text-text hover:text-heading">Contact secretariat</Link></li>
            </ul>
          </div>

          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
              For members
            </div>
            <ul className="mt-4 space-y-2 text-sm">
              <li><Link href="/login" className="no-underline text-text hover:text-heading">Member sign in</Link></li>
              <li><Link href="/chapters" className="no-underline text-text hover:text-heading">Find your chapter</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-border pt-6 text-xs text-muted md:flex-row md:items-center">
          <div>&copy; {year} UPCBMA. All rights reserved.</div>
        </div>
      </div>
    </footer>
  );
}
