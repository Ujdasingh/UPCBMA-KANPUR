/**
 * Chapter + admin-scope types + helpers.
 * These live separately from db-types.ts so they can evolve independently as
 * the multi-chapter schema grows.
 */

export type Chapter = {
  id: string;
  slug: string;
  name: string;
  city: string;
  state: string;
  established_on: string | null;
  logo_url: string | null;
  accent_color: string | null;
  active: boolean;
  display_order: number;
};

export type MemberCategory = {
  id: string;
  chapter_id: string;
  slug: string;
  name: string;
  description: string | null;
  sort_order: number;
};

export type ChapterMembership = {
  id: string;
  member_id: string;
  chapter_id: string;
  category_id: string | null;
  member_since: string;
  active: boolean;
  notes: string | null;
};

export type AdminScope = {
  id: string;
  member_id: string;
  chapter_id: string | null; // null = state-wide
  granted_at: string;
  granted_by: string | null;
};

/** Cookie key for the currently-active chapter in the admin. */
export const ACTIVE_CHAPTER_COOKIE = "upcbma_active_chapter";
/** Sentinel string used in the cookie for "All chapters" (state) view. */
export const ACTIVE_CHAPTER_ALL = "_all";
