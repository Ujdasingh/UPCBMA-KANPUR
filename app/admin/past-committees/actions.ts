"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { getAdminContext, getAuthedAdmin } from "@/lib/auth";

function readForm(formData: FormData) {
  const fy_label = String(formData.get("fy_label") ?? "").trim();
  const starts_on = String(formData.get("starts_on") ?? "").trim();
  const ends_on = String(formData.get("ends_on") ?? "").trim();
  const president_name = String(formData.get("president_name") ?? "").trim();
  const president_member_id =
    String(formData.get("president_member_id") ?? "").trim() || null;
  const president_photo_url =
    String(formData.get("president_photo_url") ?? "").trim() || null;
  const achievements =
    String(formData.get("achievements") ?? "").trim() || null;
  const display_order = Number(formData.get("display_order") ?? 0);

  if (!fy_label) throw new Error("FY label is required (e.g. 'FY 2024-25').");
  if (!starts_on || !ends_on) throw new Error("Term dates are required.");
  if (ends_on < starts_on) throw new Error("End must be on or after start.");
  if (!president_name) throw new Error("President name is required.");

  return {
    fy_label,
    starts_on,
    ends_on,
    president_name,
    president_member_id,
    president_photo_url,
    achievements,
    display_order: Number.isFinite(display_order) ? display_order : 0,
  };
}

export async function createPastTerm(formData: FormData) {
  const ctx = await getAdminContext();
  if (!ctx.activeChapterId) {
    throw new Error("Pick a chapter from the sidebar first.");
  }
  const svc = createServiceClient();
  const payload = readForm(formData);
  const { error } = await svc.from("past_committee_terms").insert({
    ...payload,
    chapter_id: ctx.activeChapterId,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/admin/past-committees");
  if (ctx.activeChapter?.slug) {
    revalidatePath(`/${ctx.activeChapter.slug}/past-committees`);
    revalidatePath(`/${ctx.activeChapter.slug}`);
  }
}

export async function updatePastTerm(id: string, formData: FormData) {
  await getAuthedAdmin();
  const svc = createServiceClient();
  const payload = readForm(formData);
  const { error } = await svc
    .from("past_committee_terms")
    .update(payload)
    .eq("id", id);
  if (error) throw new Error(error.message);

  // Find the chapter so we can revalidate the public page.
  const { data: row } = await svc
    .from("past_committee_terms")
    .select("chapter_id, chapters!inner(slug)")
    .eq("id", id)
    .maybeSingle();
  const slug = (row as unknown as { chapters: { slug: string } } | null)
    ?.chapters?.slug;

  revalidatePath("/admin/past-committees");
  if (slug) {
    revalidatePath(`/${slug}/past-committees`);
    revalidatePath(`/${slug}`);
  }
}

export async function deletePastTerm(id: string) {
  await getAuthedAdmin();
  const svc = createServiceClient();
  const { data: row } = await svc
    .from("past_committee_terms")
    .select("chapter_id, chapters!inner(slug)")
    .eq("id", id)
    .maybeSingle();
  const slug = (row as unknown as { chapters: { slug: string } } | null)
    ?.chapters?.slug;

  const { error } = await svc
    .from("past_committee_terms")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/past-committees");
  if (slug) {
    revalidatePath(`/${slug}/past-committees`);
    revalidatePath(`/${slug}`);
  }
}
