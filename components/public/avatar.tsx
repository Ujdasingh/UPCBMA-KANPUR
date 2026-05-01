import { cn } from "@/lib/utils";

/**
 * Initials-based avatar tile.
 *
 * - When `src` is provided we render the photo with object-cover.
 * - Otherwise we draw initials on a stable background colour derived from the
 *   name's hash so the same person gets the same tile across renders.
 *
 * Initials/photo logic is intentionally agnostic of where the URL came from
 * (Supabase Storage, Gravatar, hot-link, etc.) so callers can pass anything.
 */

const tones = [
  { bg: "bg-slate-100",   fg: "text-slate-700"   },
  { bg: "bg-amber-100",   fg: "text-amber-800"   },
  { bg: "bg-emerald-100", fg: "text-emerald-800" },
  { bg: "bg-sky-100",     fg: "text-sky-800"     },
  { bg: "bg-rose-100",    fg: "text-rose-800"    },
  { bg: "bg-violet-100",  fg: "text-violet-800"  },
  { bg: "bg-stone-100",   fg: "text-stone-700"   },
];

function hashStr(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

export function Avatar({
  name,
  src,
  size = "md",
  className,
}: {
  name?: string | null;
  /** Public URL to the member's photo. Falls back to initials when absent. */
  src?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const n = name?.trim() || "?";
  const tone = tones[hashStr(n) % tones.length]!;
  const sizeClass =
    size === "sm"
      ? "h-9 w-9 text-xs"
      : size === "lg"
        ? "h-16 w-16 text-lg"
        : "h-12 w-12 text-sm";

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={n}
        className={cn(
          "shrink-0 rounded-sm border border-border bg-surface object-cover",
          sizeClass,
          className,
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-sm border border-border font-semibold tracking-wide",
        sizeClass,
        tone.bg,
        tone.fg,
        className,
      )}
      aria-hidden="true"
    >
      {initials(n)}
    </div>
  );
}
