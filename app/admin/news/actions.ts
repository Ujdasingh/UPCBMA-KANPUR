"use server";

import { createClient } from "@/lib/supabase/server";
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
  const supabase = await createClient();
  const { error } = await supabase.from("news").insert(parseForm(formData));
  if (error) throw new Error(error.message);
  revalidatePath("/admin/news");
}

export async function updateNews(id: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("news")
    .update(parseForm(formData))
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/news");
}

export async function deleteNews(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("news").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/news");
}
