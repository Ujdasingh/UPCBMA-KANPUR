"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { getAdminContext } from "@/lib/auth";
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

  if (!title) throw new Error("Title is required");
  return { title, body, tag, published_date };
}

export async function createNews(formData: FormData) {
  const ctx = await getAdminContext();
  const svc = createServiceClient();
  // If active chapter: post goes to that chapter. If All chapters: state-wide (null).
  const chapter_id = ctx.activeChapterId;
  const { error } = await svc
    .from("news")
    .insert({ ...parseForm(formData), chapter_id });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/news");
}

export async function updateNews(id: string, formData: FormData) {
  await getAdminContext();
  const svc = createServiceClient();
  const { error } = await svc
    .from("news")
    .update(parseForm(formData))
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/news");
}

export async function deleteNews(id: string) {
  await getAdminContext();
  const svc = createServiceClient();
  const { error } = await svc.from("news").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/news");
}
