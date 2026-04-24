"use client";

import { setActiveChapter } from "@/app/admin/chapter-actions";
import { ACTIVE_CHAPTER_ALL, type Chapter } from "@/lib/chapters";
import { Building2 } from "lucide-react";

export function ChapterSwitcher({
  chapters,
  activeSlug,
  canSeeAll,
}: {
  chapters: Chapter[];
  activeSlug: string | null;
  canSeeAll: boolean;
}) {
  // Value to pre-select in the dropdown.
  const value = activeSlug ?? (canSeeAll ? ACTIVE_CHAPTER_ALL : chapters[0]?.slug ?? "");

  return (
    <form action={setActiveChapter} className="mb-4">
      <label className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
        <Building2 className="h-3 w-3" strokeWidth={1.75} />
        Chapter
      </label>
      <select
        name="chapter_slug"
        defaultValue={value}
        className="w-full rounded-sm border border-border bg-bg px-2 py-1.5 text-sm font-medium text-heading focus-visible:border-heading focus-visible:outline-none"
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
      >
        {canSeeAll && (
          <option value={ACTIVE_CHAPTER_ALL}>All chapters</option>
        )}
        {chapters.map((c) => (
          <option key={c.id} value={c.slug}>
            {c.name}
          </option>
        ))}
      </select>
    </form>
  );
}
