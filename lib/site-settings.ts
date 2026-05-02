import { createServiceClient } from "@/lib/supabase/server";

const FALLBACK_LOGO = "/upcbma-logo.svg";

/**
 * Read a site_settings row by key. Returns null if the table doesn't exist
 * (migration not applied yet) or the row is missing/empty. All callers
 * should fall back gracefully.
 */
export async function getSetting(key: string): Promise<string | null> {
  const svc = createServiceClient();
  try {
    const { data, error } = await svc
      .from("site_settings")
      .select("value")
      .eq("key", key)
      .maybeSingle();
    if (error) return null;
    const v = data?.value?.trim();
    return v || null;
  } catch {
    return null;
  }
}

/**
 * Resolve the URL of the state-level logo. Fallback = bundled /upcbma-logo.svg
 * so the site keeps rendering even before the migration is run.
 */
export async function getStateLogoUrl(): Promise<string> {
  return (await getSetting("state_logo_url")) ?? FALLBACK_LOGO;
}

/**
 * Resolve a chapter's logo URL — chapter override OR state fallback.
 */
export async function resolveChapterLogo(
  chapterLogoUrl: string | null | undefined,
): Promise<string> {
  if (chapterLogoUrl && chapterLogoUrl.trim()) return chapterLogoUrl;
  return getStateLogoUrl();
}

/**
 * Resolve the URL of the home-page hero image. Falls back to whatever
 * the state logo is set to so a fresh deployment always renders something
 * reasonable. Admins can override either separately:
 *   - `home_hero_url` → custom hero (e.g. an industry photo)
 *   - `state_logo_url` → org logo, used as the default
 */
export async function getHomeHeroUrl(): Promise<string> {
  return (
    (await getSetting("home_hero_url")) ??
    (await getSetting("state_logo_url")) ??
    FALLBACK_LOGO
  );
}

export async function getAllSettings(): Promise<Record<string, string | null>> {
  const svc = createServiceClient();
  try {
    const { data, error } = await svc
      .from("site_settings")
      .select("key, value");
    if (error) return {};
    const out: Record<string, string | null> = {};
    (data ?? []).forEach((r) => {
      out[r.key] = r.value;
    });
    return out;
  } catch {
    return {};
  }
}
