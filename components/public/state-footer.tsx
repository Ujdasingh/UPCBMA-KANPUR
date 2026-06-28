import Link from "next/link";
import { Logo } from "./logo";
import { getAuthedMember } from "@/lib/auth";

export async function StateFooter({
  logoSrc,
  className,
}: {
  logoSrc?: string;
  className?: string;
}) {
  const me = await getAuthedMember();
  const year = new Date().getFullYear();

  // Social icons used to live here, but every one of them pointed at
  // /coming-soon — five dead links signalled an unfinished site. The row
  // is removed entirely; when UPCBMA has real Facebook/Instagram/etc.
  // handles, re-add only the platforms that actually exist.

  return (
    <footer className={"mt-20 bg-surface" + (className ? ` ${className}` : "")}>
      {/* Brand accent stripe — mirrors the header */}
      <div className="h-[3px] w-full bg-gradient-to-r from-[#dca135] via-[#0d6b3e] to-[#dca135]" />

      <div className="mx-auto max-w-7xl px-6 py-14">
        {/* Top — brand + sitemap */}
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <Logo size={40} src={logoSrc} />
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
                  Uttar Pradesh
                </div>
                <div className="mt-0.5 text-base font-semibold text-heading">UPCBMA</div>
              </div>
            </div>
            <p className="mt-4 max-w-sm text-sm text-muted">
              The state body of corrugated box manufacturers in Uttar
              Pradesh — coordinating advocacy, lab testing, training, and
              member services through regional chapters.
            </p>
          </div>

          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
              Explore
            </div>
            <ul className="mt-4 space-y-2 text-sm">
              <li><Link href="/" className="no-underline text-text hover:text-heading">Home</Link></li>
              <li><Link href="/about" className="no-underline text-text hover:text-heading">About UPCBMA</Link></li>
              <li><Link href="/chapters" className="no-underline text-text hover:text-heading">All chapters</Link></li>
              <li><Link href="/agendas" className="no-underline text-text hover:text-heading">Agendas</Link></li>
              <li><Link href="/news" className="no-underline text-text hover:text-heading">News</Link></li>
              <li><Link href="/events" className="no-underline text-text hover:text-heading">Events</Link></li>
            </ul>
          </div>

          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
              For members
            </div>
            <ul className="mt-4 space-y-2 text-sm">
              <li><Link href="/join" className="no-underline text-text hover:text-heading">Join UPCBMA</Link></li>
              <li><Link href="/agendas/propose" className="no-underline text-text hover:text-heading">Propose an agenda</Link></li>
              <li>
                {me ? (
                  <Link
                    href="/me"
                    className="no-underline text-text hover:text-heading"
                  >
                    My account
                  </Link>
                ) : (
                  <Link
                    href="/login"
                    className="no-underline text-text hover:text-heading"
                  >
                    Sign in
                  </Link>
                )}
              </li>
              <li><Link href="/contact" className="no-underline text-text hover:text-heading">Contact secretariat</Link></li>
            </ul>
          </div>

          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
              Legal
            </div>
            <ul className="mt-4 space-y-2 text-sm">
              <li><Link href="/privacy-policy" className="no-underline text-text hover:text-heading">Privacy policy</Link></li>
              <li><Link href="/disclaimer" className="no-underline text-text hover:text-heading">Disclaimer</Link></li>
              <li><Link href="/terms" className="no-underline text-text hover:text-heading">Terms &amp; conditions</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom strip */}
        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-border pt-6 text-xs text-muted md:flex-row md:items-center">
          <div>&copy; {year} UPCBMA. All rights reserved.</div>
          <div className="flex flex-wrap gap-5">
            <Link href="/privacy-policy" className="no-underline hover:text-heading">Privacy</Link>
            <Link href="/disclaimer" className="no-underline hover:text-heading">Disclaimer</Link>
            <Link href="/terms" className="no-underline hover:text-heading">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
