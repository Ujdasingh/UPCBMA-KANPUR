"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { getAdminContext } from "@/lib/auth";
import { revalidatePath } from "next/cache";

function parseForm(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const event_date = String(formData.get("event_date") ?? "").trim() || null;
  const event_time = String(formData.get("event_time") ?? "").trim() || null;
  const venue = String(formData.get("venue") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;
  const recurring = formData.get("recurring") === "on";

  if (!name) throw new Error("Event name is required");
  return { name, event_date, event_time, venue, description, recurring };
}

export async function createEvent(formData: FormData) {
  const ctx = await getAdminContext();
  const svc = createServiceClient();
  const chapter_id = ctx.activeChapterId;
  const { error } = await svc
    .from("events")
    .insert({ ...parseForm(formData), chapter_id });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/events");
}

export async function updateEvent(id: string, formData: FormData) {
  await getAdminContext();
  const svc = createServiceClient();
  const { error } = await svc
    .from("events")
    .update(parseForm(formData))
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/events");
}

export async function deleteEvent(id: string) {
  await getAdminContext();
  const svc = createServiceClient();
  const { error } = await svc.from("events").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/events");
}
