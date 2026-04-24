/**
 * Server-side helper: resolve a chapter by its public slug from the URL.
 * Used by every /[slug]/* page. Returns null if the slug doesn't match
 * an active chapter — callers call notFound() in that case.
 */
import { createServiceClient } from "@/lib/supabase/server";
import type { Chapter } from "@/lib/chapters";

export async function getChapterBySlug(slug: string): Promise<Chapter | null> {
  const svc = createServiceClient();
  const { data } = await svc
    .from("chapters")
    .select(
      "id, slug, name, city, state, established_on, logo_url, accent_color, active, display_order",
    )
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();
  return (data as Chapter) ?? null;
}

export async function listActiveChapters(): Promise<Chapter[]> {
  const svc = createServiceClient();
  const { data } = await svc
    .from("chapters")
    .select(
      "id, slug, name, city, state, established_on, logo_url, accent_color, active, display_order",
    )
    .eq("active", true)
    .order("display_order", { ascending: true });
  return (data ?? []) as Chapter[];
}

/**
 * Reserved slugs that must not collide with top-level routes or the
 * chapter-slug dynamic segment.
 */
export const RESERVED_SLUGS = new Set<string>([
  "admin",
  "login",
  "api",
  "about",
  "chapters",
  "contact",
  "events",
  "news",
  "committee",
  "lab",
  "members",
  "directory",
  "_next",
  "static",
  "public",
]);
