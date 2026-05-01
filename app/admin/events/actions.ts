"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { getAdminContext } from "@/lib/auth";
import { assertNotLocked } from "@/lib/locks";
import { revalidatePath } from "next/cache";

function parseForm(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const event_date = String(formData.get("event_date") ?? "").trim() || null;
  const event_time = String(formData.get("event_time") ?? "").trim() || null;
  const venue = String(formData.get("venue") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;
  const recurring = formData.get("recurring") === "on";
  const imgRaw = String(formData.get("image_url") ?? "").trim();
  const image_url = imgRaw && /^https?:\/\//i.test(imgRaw) ? imgRaw : null;

  if (!name) throw new Error("Event name is required");
  return { name, event_date, event_time, venue, description, recurring, image_url };
}

export async function createEvent(formData: FormData) {
  const ctx = await getAdminContext();
  await assertNotLocked(ctx.me, {
    category: "events",
    chapterId: ctx.activeChapterId,
  });
  const svc = createServiceClient();
  const chapter_id = ctx.activeChapterId;
  const { error } = await svc
    .from("events")
    .insert({ ...parseForm(formData), chapter_id });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/events");
  revalidatePath("/events");
  if (ctx.activeChapter?.slug) revalidatePath(`/${ctx.activeChapter.slug}`);
}

export async function updateEvent(id: string, formData: FormData) {
  const ctx = await getAdminContext();
  await assertNotLocked(ctx.me, {
    category: "events",
    chapterId: ctx.activeChapterId,
    resourceId: id,
  });
  const svc = createServiceClient();
  const { error } = await svc
    .from("events")
    .update(parseForm(formData))
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/events");
  revalidatePath("/events");
  if (ctx.activeChapter?.slug) revalidatePath(`/${ctx.activeChapter.slug}`);
}

export async function deleteEvent(id: string) {
  const ctx = await getAdminContext();
  await assertNotLocked(ctx.me, {
    category: "events",
    chapterId: ctx.activeChapterId,
    resourceId: id,
  });
  const svc = createServiceClient();
  const { error } = await svc.from("events").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/events");
  revalidatePath("/events");
  if (ctx.activeChapter?.slug) revalidatePath(`/${ctx.activeChapter.slug}`);
}
