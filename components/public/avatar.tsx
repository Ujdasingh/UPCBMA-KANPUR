import { cn } from "@/lib/utils";

/**
 * Initials-based avatar tile. Picks a stable background tone from a hash of
 * the name so the same person gets the same colour across renders.
 */
const tones = [
  { bg: "bg-slate-100", fg: "text-slate-700" },
  { bg: "bg-amber-100", fg: "text-amber-800" },
  { bg: "bg-emerald-100", fg: "text-emerald-800" },
  { bg: "bg-sky-100", fg: "text-sky-800" },
  { bg: "bg-rose-100", fg: "text-rose-800" },
  { bg: "bg-violet-100", fg: "text-violet-800" },
  { bg: "bg-stone-100", fg: "text-stone-700" },
];

function hashStr(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "?";
}

export function Avatar({
  name,
  size = "md",
  className,
}: {
  name?: string | null;
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
