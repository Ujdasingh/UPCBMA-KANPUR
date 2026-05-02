import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Building2,
  Megaphone,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";

/**
 * Onboarding checklist for an empty chapter dashboard.
 *
 * Lands above the stat tiles when the chapter has missing setup pieces
 * (no members, no committee, no news, no upcoming events, no office info,
 * or no established date). Renders only the *undone* items so the panel
 * shrinks as the admin works through it, and disappears entirely once
 * everything is in place — no manual dismissal needed.
 *
 * Pure presentational: caller decides what counts as done. We just render.
 */

export type OnboardingItem = {
  /** Stable key for React reconciliation. */
  key:
    | "members"
    | "committee"
    | "office"
    | "established"
    | "news"
    | "events"
    | "lab";
  done: boolean;
  /** Short headline. */
  title: string;
  /** One-line "why this matters" so the admin doesn't have to guess. */
  description: string;
  /** Where the CTA button takes them. */
  href: string;
  /** Button label. Kept short to fit on mobile. */
  cta: string;
};

const ICONS: Record<OnboardingItem["key"], typeof UserPlus> = {
  members: UserPlus,
  committee: Users,
  office: Building2,
  established: Calendar,
  news: Megaphone,
  events: ClipboardList,
  lab: Sparkles,
};

export function OnboardingChecklist({
  items,
  chapterName,
}: {
  items: OnboardingItem[];
  chapterName: string;
}) {
  const undone = items.filter((i) => !i.done);
  const doneCount = items.length - undone.length;
  // Nothing to nag about — let the dashboard breathe.
  if (undone.length === 0) return null;

  return (
    <section
      aria-labelledby="onboarding-heading"
      className="mb-6 overflow-hidden rounded-sm border border-border bg-surface"
    >
      <header className="flex items-center justify-between gap-3 border-b border-border bg-bg px-5 py-3">
        <div className="min-w-0">
          <h2
            id="onboarding-heading"
            className="text-sm font-semibold text-heading"
          >
            Get {chapterName} ready
          </h2>
          <p className="mt-0.5 text-xs text-muted">
            A short setup so the public page feels alive. The list shrinks as
            you go — once everything's done, this panel disappears.
          </p>
        </div>
        <div className="hidden shrink-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted sm:block">
          {doneCount} / {items.length} done
        </div>
      </header>

      <ul className="divide-y divide-border">
        {undone.map((item) => {
          const Icon = ICONS[item.key];
          return (
            <li
              key={item.key}
              className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center"
            >
              <div className="flex flex-1 items-start gap-3">
                <div className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-border bg-bg text-heading">
                  <Icon className="h-4 w-4" strokeWidth={1.75} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-heading">
                    {item.title}
                  </div>
                  <div className="mt-0.5 text-xs text-muted">
                    {item.description}
                  </div>
                </div>
              </div>
              <Link
                href={item.href}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-sm bg-heading px-4 text-sm font-medium text-white no-underline transition-colors hover:bg-hover sm:shrink-0"
              >
                {item.cta}
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Tiny "already done" footer so admins feel progress, not just nagging. */}
      {doneCount > 0 && (
        <footer className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border bg-bg px-5 py-3 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5 font-medium text-heading">
            <CheckCircle2
              className="h-3.5 w-3.5 text-emerald-600"
              strokeWidth={2}
            />
            {doneCount} done
          </span>
          {items
            .filter((i) => i.done)
            .map((i) => (
              <span key={i.key} className="line-through opacity-70">
                {i.title}
              </span>
            ))}
        </footer>
      )}
    </section>
  );
}
