"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import type { Chapter } from "@/lib/chapters";

/**
 * A small chapter-switcher dropdown used by state pages with chapter-scoped
 * content (lab, news, events, agendas).
 *
 * It writes the chosen slug into the `?chapter=…` query param. The page reads
 * that param server-side and re-renders with that chapter's content. We use
 * `router.push` (not `router.replace`) so back-button gives the previous
 * chapter — this is a meaningful navigation, not a UI tweak.
 */
export function ChapterPicker({
  chapters,
  value,
  basePath,
  label = "Chapter",
}: {
  chapters: Chapter[];
  value: string;
  basePath: string;
  label?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <label className="block w-full md:w-72">
      <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
        {label}
      </span>
      <span className="relative mt-1 block">
        <select
          value={value}
          onChange={(e) => {
            const next = e.target.value;
            startTransition(() => {
              router.push(`${basePath}?chapter=${next}`);
            });
          }}
          disabled={pending}
          className="h-11 w-full appearance-none rounded-sm border border-border bg-bg pl-3 pr-9 text-sm text-text focus-visible:border-heading focus-visible:outline-none disabled:opacity-60"
        >
          {chapters.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name} — {c.city}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted">
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.25} />
          ) : (
            <svg
              width="10"
              height="6"
              viewBox="0 0 10 6"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M1 1l4 4 4-4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          )}
        </span>
      </span>
    </label>
  );
}
