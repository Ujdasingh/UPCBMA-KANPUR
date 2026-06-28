"use client";

import Link from "next/link";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { castAgendaVote } from "@/app/agendas/engagement-actions";

/**
 * Up/down vote pair for an agenda. Shows totals to everyone, but only
 * authenticated members can cast a vote. For anonymous visitors the
 * buttons act as a "Sign in to vote" link instead — keeps the read
 * experience friendly without bouncing them mid-scroll.
 *
 * Optimistic update: we adjust the local counts immediately on click so
 * the UI feels instant; the server action either confirms (no-op) or
 * the next page load corrects any drift.
 */
export function AgendaVoteButtons({
  agendaId,
  initial,
  signedIn,
  size = "md",
  className,
  showWeighted,
}: {
  agendaId: string;
  initial: {
    up: number;
    down: number;
    upWeighted?: number;
    downWeighted?: number;
    myVote: "up" | "down" | null;
  };
  signedIn: boolean;
  /** "sm" suits inline cards, "md" suits the agenda detail header. */
  size?: "sm" | "md";
  className?: string;
  /** Show the weighted-by-role score under the buttons. Defaults to true
   *  on the detail page; cards keep it off to stay compact. */
  showWeighted?: boolean;
}) {
  const [up, setUp] = useState(initial.up);
  const [down, setDown] = useState(initial.down);
  const [myVote, setMyVote] = useState<"up" | "down" | null>(initial.myVote);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const upWeighted = initial.upWeighted ?? initial.up;
  const downWeighted = initial.downWeighted ?? initial.down;
  const hasWeighting =
    showWeighted &&
    (upWeighted !== initial.up || downWeighted !== initial.down);

  // Anonymous: render as a sign-in nudge that preserves the agenda URL
  // so they're returned here after logging in.
  if (!signedIn) {
    const next =
      typeof window === "undefined" ? "" : window.location.pathname;
    return (
      <div className={cn("inline-flex items-center gap-2", className)}>
        <SignInButton href={`/login?next=${encodeURIComponent(next)}`} size={size}>
          <ThumbsUp className={iconClass(size)} strokeWidth={1.75} />
          <span className="tabular-nums">{up}</span>
        </SignInButton>
        <SignInButton href={`/login?next=${encodeURIComponent(next)}`} size={size}>
          <ThumbsDown className={iconClass(size)} strokeWidth={1.75} />
          <span className="tabular-nums">{down}</span>
        </SignInButton>
      </div>
    );
  }

  function cast(direction: "up" | "down") {
    if (pending) return;
    setError(null);

    // Optimistic update — mirror the server toggle semantics.
    const wasMine = myVote;
    if (wasMine === direction) {
      // Toggle off.
      setMyVote(null);
      if (direction === "up") setUp((n) => Math.max(0, n - 1));
      else setDown((n) => Math.max(0, n - 1));
    } else if (wasMine && wasMine !== direction) {
      // Switch direction — decrement old, increment new.
      setMyVote(direction);
      if (wasMine === "up") setUp((n) => Math.max(0, n - 1));
      else setDown((n) => Math.max(0, n - 1));
      if (direction === "up") setUp((n) => n + 1);
      else setDown((n) => n + 1);
    } else {
      // Fresh vote.
      setMyVote(direction);
      if (direction === "up") setUp((n) => n + 1);
      else setDown((n) => n + 1);
    }

    startTransition(async () => {
      const res = await castAgendaVote(agendaId, direction);
      if (!res.ok) {
        // Roll back the optimistic change and show the error inline.
        setMyVote(wasMine);
        setUp(initial.up);
        setDown(initial.down);
        setError(res.error);
      }
    });
  }

  const baseBtn =
    size === "sm"
      ? "inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed"
      : "inline-flex items-center gap-2 rounded-sm border px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed";

  return (
    <div className={cn("inline-flex flex-col items-start gap-1", className)}>
      <div className="inline-flex items-center gap-2">
        <button
          type="button"
          onClick={() => cast("up")}
          disabled={pending}
          aria-pressed={myVote === "up"}
          aria-label={`Upvote · ${up} so far`}
          className={cn(
            baseBtn,
            myVote === "up"
              ? "border-emerald-300 bg-emerald-50 text-emerald-800"
              : "border-border bg-bg text-text hover:border-heading hover:text-heading",
          )}
        >
          <ThumbsUp className={iconClass(size)} strokeWidth={1.75} />
          <span className="tabular-nums">{up}</span>
        </button>
        <button
          type="button"
          onClick={() => cast("down")}
          disabled={pending}
          aria-pressed={myVote === "down"}
          aria-label={`Downvote · ${down} so far`}
          className={cn(
            baseBtn,
            myVote === "down"
              ? "border-rose-300 bg-rose-50 text-rose-800"
              : "border-border bg-bg text-text hover:border-heading hover:text-heading",
          )}
        >
          <ThumbsDown className={iconClass(size)} strokeWidth={1.75} />
          <span className="tabular-nums">{down}</span>
        </button>
      </div>
      {hasWeighting && (
        <span
          className="text-[11px] text-muted"
          title="Vote weights: 1 = member, 2 = committee, 3 = officer (president/secretary/treasurer)"
        >
          weighted score · {upWeighted} for / {downWeighted} against
        </span>
      )}
      {error && (
        <span className="text-[11px] text-danger">{error}</span>
      )}
    </div>
  );
}

function SignInButton({
  href,
  size,
  children,
}: {
  href: string;
  size: "sm" | "md";
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      title="Sign in to vote"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border border-border bg-bg text-muted no-underline transition-colors hover:border-heading hover:text-heading",
        size === "sm"
          ? "gap-1.5 px-2.5 py-1 text-xs font-medium"
          : "gap-2 px-3 py-1.5 text-sm font-medium",
      )}
    >
      {children}
    </Link>
  );
}

function iconClass(size: "sm" | "md") {
  return size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";
}
