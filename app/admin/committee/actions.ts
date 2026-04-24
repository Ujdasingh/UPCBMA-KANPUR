"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { getAdminContext } from "@/lib/auth";
import { revalidatePath } from "next/cache";

function parseForm(formData: FormData) {
  const member_id = String(formData.get("member_id") ?? "").trim();
  const role_key = String(formData.get("role_key") ?? "").trim();
  const area_name = String(formData.get("area_name") ?? "").trim() || null;
  const term_start = String(formData.get("term_start") ?? "").trim();
  const term_end = String(formData.get("term_end") ?? "").trim();
  const status = String(formData.get("status") ?? "active") as
    | "active"
    | "inactive"
    | "ended";
  const display_order = Number(formData.get("display_order") ?? 0);
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!member_id) throw new Error("Member is required");
  if (!role_key) throw new Error("Role is required");
  if (!term_start || !term_end) throw new Error("Term dates are required");
  if (term_end < term_start) throw new Error("Term end must be after start");

  return {
    member_id,
    role_key,
    area_name,
    term_start,
    term_end,
    status,
    display_order,
    notes,
  };
}

export async function createAppointment(formData: FormData) {
  const ctx = await getAdminContext();
  if (!ctx.activeChapterId) {
    throw new Error("Pick a chapter from the sidebar first.");
  }
  const svc = createServiceClient();
  const payload = parseForm(formData);
  const { error } = await svc
    .from("committee_appointments")
    .insert({ ...payload, chapter_id: ctx.activeChapterId });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/committee");
}

export async function updateAppointment(id: string, formData: FormData) {
  await getAdminContext();
  const svc = createServiceClient();
  const payload = parseForm(formData);
  const { error } = await svc
    .from("committee_appointments")
    .update(payload)
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/committee");
}

export async function endAppointment(id: string) {
  await getAdminContext();
  const svc = createServiceClient();
  const { error } = await svc
    .from("committee_appointments")
    .update({ status: "ended" })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/committee");
}

export async function deleteAppointment(id: string) {
  await getAdminContext();
  const svc = createServiceClient();
  const { error } = await svc
    .from("committee_appointments")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/committee");
}
