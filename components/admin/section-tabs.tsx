"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * Inline tab strip used at the top of admin pages that share a section.
 *
 * Example: Committee groups two related views — "Appointments" (who holds
 * which role this term) and "Roles" (which roles exist on the committee).
 * Rather than having two sidebar entries, the sidebar shows one entry and
 * this strip toggles between them.
 *
 * Highlighting is path-prefix based (so `/admin/committee/123` still flags
 * the "Committee" tab) but exact-match via the `exact` flag for top-level
 * roots that would otherwise match too broadly.
 */
export function SectionTabs({
  tabs,
}: {
  tabs: { href: string; label: string; exact?: boolean }[];
}) {
  const pathname = usePathname();

  return (
    <div className="-mt-2 mb-6 overflow-x-auto border-b border-border">
      <div className="flex min-w-max gap-1">
        {tabs.map((t) => {
          const active = t.exact
            ? pathname === t.href
            : pathname === t.href || pathname.startsWith(t.href + "/");
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                "relative -mb-px inline-flex items-center px-3 py-2 text-sm no-underline transition-colors",
                active
                  ? "border-b-2 border-heading font-semibold text-heading"
                  : "border-b-2 border-transparent text-muted hover:text-heading",
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
