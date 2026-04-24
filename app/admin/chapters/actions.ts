"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { getAuthedAdmin, isSuperAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

function isRedirect(e: unknown): boolean {
  const d = (e as { digest?: string } | undefined)?.digest;
  return typeof d === "string" && d.startsWith("NEXT_REDIRECT");
}

function redirectWithError(msg: string): never {
  redirect("/admin/chapters?error=" + encodeURIComponent(msg));
}
function redirectOK(msg: string): never {
  redirect("/admin/chapters?ok=" + encodeURIComponent(msg));
}

function slugify(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function parseChapterForm(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const slugRaw = String(formData.get("slug") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const state = String(formData.get("state") ?? "").trim() || "Uttar Pradesh";
  const establishedRaw = String(formData.get("established_on") ?? "").trim();
  const logoUrl = String(formData.get("logo_url") ?? "").trim() || null;
  const accentColor = String(formData.get("accent_color") ?? "").trim() || null;
  const displayOrderRaw = String(formData.get("display_order") ?? "").trim();
  const active = formData.get("active") === "on";

  return {
    name,
    slug: slugify(slugRaw || name),
    city,
    state,
    established_on: establishedRaw || null,
    logo_url: logoUrl,
    accent_color: accentColor,
    display_order: displayOrderRaw ? Number(displayOrderRaw) : 0,
    active,
  };
}

async function requireSuperAdmin() {
  const me = await getAuthedAdmin();
  if (!isSuperAdmin(me)) redirectWithError("Forbidden.");
  return me;
}

export async function createChapter(formData: FormData) {
  try {
    await requireSuperAdmin();
    const payload = parseChapterForm(formData);
    if (!payload.name) redirectWithError("Chapter name is required.");
    if (!payload.slug) redirectWithError("Slug is required.");
    if (!payload.city) redirectWithError("City is required.");

    const svc = createServiceClient();
    const { error } = await svc.from("chapters").insert(payload);
    if (error) {
      if (error.code === "23505")
        redirectWithError(`Slug "${payload.slug}" is already taken.`);
      redirectWithError(error.message);
    }

    revalidatePath("/admin/chapters");
    revalidatePath("/admin", "layout");
    redirectOK("Chapter created.");
  } catch (e) {
    if (isRedirect(e)) throw e;
    redirectWithError(e instanceof Error ? e.message : String(e));
  }
}

export async function updateChapter(id: string, formData: FormData) {
  try {
    await requireSuperAdmin();
    const payload = parseChapterForm(formData);

    const svc = createServiceClient();
    const { error } = await svc.from("chapters").update(payload).eq("id", id);
    if (error) {
      if (error.code === "23505")
        redirectWithError(`Slug "${payload.slug}" is already taken.`);
      redirectWithError(error.message);
    }

    revalidatePath("/admin/chapters");
    revalidatePath("/admin", "layout");
    redirectOK("Chapter updated.");
  } catch (e) {
    if (isRedirect(e)) throw e;
    redirectWithError(e instanceof Error ? e.message : String(e));
  }
}

export async function deleteChapter(id: string) {
  try {
    await requireSuperAdmin();
    if (id === "11111111-1111-1111-1111-111111111111") {
      redirectWithError(
        "Cannot delete the Kanpur chapter — it anchors the existing data.",
      );
    }

    const svc = createServiceClient();
    // Refuse if there are non-trivial chapter-scoped rows (safety net)
    const { count: memberCount } = await svc
      .from("chapter_memberships")
      .select("*", { head: true, count: "exact" })
      .eq("chapter_id", id);
    if (memberCount && memberCount > 0) {
      redirectWithError(
        `Chapter has ${memberCount} member(s). Move or remove them first.`,
      );
    }

    const { error } = await svc.from("chapters").delete().eq("id", id);
    if (error) redirectWithError(error.message);

    revalidatePath("/admin/chapters");
    revalidatePath("/admin", "layout");
    redirectOK("Chapter deleted.");
  } catch (e) {
    if (isRedirect(e)) throw e;
    redirectWithError(e instanceof Error ? e.message : String(e));
  }
}
