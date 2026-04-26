"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { getAuthedMember } from "@/lib/auth";
import { slugifyAgenda } from "@/lib/agendas";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function proposeAgenda(formData: FormData) {
  const me = await getAuthedMember();
  if (!me) {
    redirect("/login?next=/agendas/propose");
  }

  const title = String(formData.get("title") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim() || null;
  const body = String(formData.get("body") ?? "").trim() || null;
  const category = String(formData.get("category") ?? "other");
  const image_url = String(formData.get("image_url") ?? "").trim() || null;
  const chapterIdRaw = String(formData.get("chapter_id") ?? "").trim();
  const chapter_id = chapterIdRaw === "" ? null : chapterIdRaw;

  if (!title) {
    redirect("/agendas/propose?error=" + encodeURIComponent("Title is required."));
  }

  const slug = slugifyAgenda(title) + "-" + Math.random().toString(36).slice(2, 6);

  const svc = createServiceClient();
  const { error } = await svc.from("agendas").insert({
    slug,
    chapter_id,
    category,
    status: "active",
    priority: "medium",
    visibility: "public",
    approval_status: "pending",
    title,
    summary,
    body,
    image_url,
    created_by: me.id,
  });

  if (error) {
    redirect("/agendas/propose?error=" + encodeURIComponent(error.message));
  }

  // Notify admins via audit row + revalidate the queue
  await svc.from("admin_audit_log").insert({
    actor_id: me.id,
    action: "propose_agenda",
    target_table: "agendas",
    target_id: slug,
    diff: { title, chapter_id },
  }).then(() => null).catch(() => null);

  revalidatePath("/admin/agendas");
  redirect("/agendas/propose?ok=1");
}
