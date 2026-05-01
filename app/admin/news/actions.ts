"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { getAdminContext } from "@/lib/auth";
import { assertNotLocked } from "@/lib/locks";
import { revalidatePath } from "next/cache";

function parseForm(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim() || null;
  const tag = String(formData.get("tag") ?? "ANNOUNCEMENT") as
    | "ANNOUNCEMENT"
    | "EVENT"
    | "NOTICE"
    | "UPDATE";
  const published_date =
    String(formData.get("published_date") ?? "").trim() ||
    new Date().toISOString().slice(0, 10);
  const image_url_raw = String(formData.get("image_url") ?? "").trim();
  // Only accept http(s) URLs — guards against accidental "file://" or other
  // schemes when admins paste from the browser. Empty string clears the field.
  const image_url =
    image_url_raw && /^https?:\/\//i.test(image_url_raw) ? image_url_raw : null;

  if (!title) throw new Error("Title is required");
  return { title, body, tag, published_date, image_url };
}

export async function createNews(formData: FormData) {
  const ctx = await getAdminContext();
  // Honour any super_admin block-out before writing.
  await assertNotLocked(ctx.me, {
    category: "news",
    chapterId: ctx.activeChapterId,
  });
  const svc = createServiceClient();
  // If active chapter: post goes to that chapter. If All chapters: state-wide (null).
  const chapter_id = ctx.activeChapterId;
  const { error } = await svc
    .from("news")
    .insert({ ...parseForm(formData), chapter_id });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/news");
  revalidatePath("/news");
  revalidatePath("/");
}

export async function updateNews(id: string, formData: FormData) {
  const ctx = await getAdminContext();
  // Lock check both at category level and at the specific row level.
  await assertNotLocked(ctx.me, {
    category: "news",
    chapterId: ctx.activeChapterId,
    resourceId: id,
  });
  const svc = createServiceClient();
  const { error } = await svc
    .from("news")
    .update(parseForm(formData))
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/news");
  revalidatePath("/news");
  revalidatePath(`/news/${id}`);
  revalidatePath("/");
}

export async function deleteNews(id: string) {
  const ctx = await getAdminContext();
  await assertNotLocked(ctx.me, {
    category: "news",
    chapterId: ctx.activeChapterId,
    resourceId: id,
  });
  const svc = createServiceClient();
  const { error } = await svc.from("news").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/news");
  revalidatePath("/news");
  revalidatePath("/");
}
