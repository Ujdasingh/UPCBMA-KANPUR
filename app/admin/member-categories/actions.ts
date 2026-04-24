"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { getAdminContext } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

function isRedirect(e: unknown): boolean {
  const d = (e as { digest?: string } | undefined)?.digest;
  return typeof d === "string" && d.startsWith("NEXT_REDIRECT");
}
function redirectWithError(msg: string): never {
  redirect("/admin/member-categories?error=" + encodeURIComponent(msg));
}
function redirectOK(msg: string): never {
  redirect("/admin/member-categories?ok=" + encodeURIComponent(msg));
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

function parseForm(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const sort_order = Number(formData.get("sort_order") ?? 0);
  const slugRaw = String(formData.get("slug") ?? "").trim();

  if (!name) throw new Error("Category name is required.");
  return { name, description, sort_order, slugRaw };
}

export async function createCategory(formData: FormData) {
  try {
    const ctx = await getAdminContext();
    if (!ctx.activeChapterId) redirectWithError("Pick a chapter first.");
    const p = parseForm(formData);
    const slug = p.slugRaw || slugify(p.name);
    const svc = createServiceClient();
    const { error } = await svc.from("member_categories").insert({
      chapter_id: ctx.activeChapterId!,
      name: p.name,
      slug,
      description: p.description,
      sort_order: p.sort_order,
    });
    if (error) {
      if (error.code === "23505")
        redirectWithError(
          `Slug "${slug}" already exists in this chapter. Pick a different name.`,
        );
      redirectWithError(error.message);
    }
    revalidatePath("/admin/member-categories");
    revalidatePath("/admin/members");
    redirectOK("Category created.");
  } catch (e) {
    if (isRedirect(e)) throw e;
    redirectWithError(e instanceof Error ? e.message : String(e));
  }
}

export async function updateCategory(id: string, formData: FormData) {
  try {
    await getAdminContext();
    const p = parseForm(formData);
    const svc = createServiceClient();
    const { error } = await svc
      .from("member_categories")
      .update({
        name: p.name,
        description: p.description,
        sort_order: p.sort_order,
      })
      .eq("id", id);
    if (error) redirectWithError(error.message);
    revalidatePath("/admin/member-categories");
    revalidatePath("/admin/members");
    redirectOK("Category updated.");
  } catch (e) {
    if (isRedirect(e)) throw e;
    redirectWithError(e instanceof Error ? e.message : String(e));
  }
}

export async function deleteCategory(id: string) {
  try {
    await getAdminContext();
    const svc = createServiceClient();
    const { count } = await svc
      .from("chapter_memberships")
      .select("*", { head: true, count: "exact" })
      .eq("category_id", id);
    if (count && count > 0) {
      redirectWithError(
        `Category still has ${count} member(s). Reassign them first.`,
      );
    }
    const { error } = await svc.from("member_categories").delete().eq("id", id);
    if (error) redirectWithError(error.message);
    revalidatePath("/admin/member-categories");
    redirectOK("Category deleted.");
  } catch (e) {
    if (isRedirect(e)) throw e;
    redirectWithError(e instanceof Error ? e.message : String(e));
  }
}
