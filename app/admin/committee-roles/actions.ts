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
  redirect("/admin/committee-roles?error=" + encodeURIComponent(msg));
}
function redirectOK(msg: string): never {
  redirect("/admin/committee-roles?ok=" + encodeURIComponent(msg));
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
  const category = String(formData.get("category") ?? "office_bearer");
  const description = String(formData.get("description") ?? "").trim() || null;
  const sort_order = Number(formData.get("sort_order") ?? 0);
  const active = formData.get("active") === "on";
  const keyRaw = String(formData.get("key") ?? "").trim();

  if (!name) throw new Error("Role name is required.");
  return { name, category, description, sort_order, active, keyRaw };
}

export async function createRole(formData: FormData) {
  try {
    const ctx = await getAdminContext();
    if (!ctx.activeChapterId || !ctx.activeChapter) {
      redirectWithError("Pick a chapter first.");
    }
    const p = parseForm(formData);
    // Build a globally-unique key: chapter_slug + "_" + role_slug
    const key =
      p.keyRaw ||
      `${ctx.activeChapter!.slug}_${slugify(p.name)}`.slice(0, 60);

    const svc = createServiceClient();
    const { error } = await svc.from("committee_roles").insert({
      chapter_id: ctx.activeChapterId!,
      key,
      name: p.name,
      category: p.category,
      description: p.description,
      sort_order: p.sort_order,
      active: p.active,
    });
    if (error) {
      if (error.code === "23505")
        redirectWithError(
          `Role key "${key}" is already used. Try a different name or set an explicit key.`,
        );
      redirectWithError(error.message);
    }

    revalidatePath("/admin/committee-roles");
    revalidatePath("/admin/committee");
    redirectOK("Role created.");
  } catch (e) {
    if (isRedirect(e)) throw e;
    redirectWithError(e instanceof Error ? e.message : String(e));
  }
}

export async function updateRole(key: string, formData: FormData) {
  try {
    await getAdminContext();
    const p = parseForm(formData);
    const svc = createServiceClient();
    const { error } = await svc
      .from("committee_roles")
      .update({
        name: p.name,
        category: p.category,
        description: p.description,
        sort_order: p.sort_order,
        active: p.active,
      })
      .eq("key", key);
    if (error) redirectWithError(error.message);

    revalidatePath("/admin/committee-roles");
    revalidatePath("/admin/committee");
    redirectOK("Role updated.");
  } catch (e) {
    if (isRedirect(e)) throw e;
    redirectWithError(e instanceof Error ? e.message : String(e));
  }
}

export async function deleteRole(key: string) {
  try {
    await getAdminContext();
    const svc = createServiceClient();
    // Refuse delete if appointments reference this role
    const { count } = await svc
      .from("committee_appointments")
      .select("*", { head: true, count: "exact" })
      .eq("role_key", key);
    if (count && count > 0) {
      redirectWithError(
        `Role has ${count} appointment(s). End or remove them first.`,
      );
    }
    const { error } = await svc.from("committee_roles").delete().eq("key", key);
    if (error) redirectWithError(error.message);

    revalidatePath("/admin/committee-roles");
    redirectOK("Role deleted.");
  } catch (e) {
    if (isRedirect(e)) throw e;
    redirectWithError(e instanceof Error ? e.message : String(e));
  }
}

/**
 * Bulk-seed a conventional office-bearer list for the active chapter.
 * Safe to re-run: uses ON CONFLICT via pre-existing key checks.
 */
export async function seedDefaultRoles() {
  try {
    const ctx = await getAdminContext();
    if (!ctx.activeChapterId || !ctx.activeChapter) {
      redirectWithError("Pick a chapter first.");
    }
    const slug = ctx.activeChapter!.slug;
    const defaults = [
      { name: "President", cat: "office_bearer", order: 10 },
      { name: "Vice President 1", cat: "office_bearer", order: 20 },
      { name: "Vice President 2", cat: "office_bearer", order: 30 },
      { name: "General Secretary", cat: "office_bearer", order: 40 },
      { name: "Joint Secretary", cat: "office_bearer", order: 50 },
      { name: "Treasurer", cat: "office_bearer", order: 60 },
      { name: "Joint Treasurer", cat: "office_bearer", order: 70 },
      { name: "Executive Member", cat: "executive", order: 100 },
      { name: "Zonal Representative", cat: "zonal", order: 200 },
      { name: "Advisor", cat: "advisory", order: 300 },
    ];
    const svc = createServiceClient();
    const rows = defaults.map((d) => ({
      chapter_id: ctx.activeChapterId!,
      key: `${slug}_${slugify(d.name)}`,
      name: d.name,
      category: d.cat,
      sort_order: d.order,
      active: true,
    }));
    // Insert each ignoring dup-key errors
    let created = 0;
    for (const r of rows) {
      const { error } = await svc.from("committee_roles").insert(r);
      if (!error) created++;
    }
    revalidatePath("/admin/committee-roles");
    redirectOK(`Seeded default role list (${created} new).`);
  } catch (e) {
    if (isRedirect(e)) throw e;
    redirectWithError(e instanceof Error ? e.message : String(e));
  }
}
