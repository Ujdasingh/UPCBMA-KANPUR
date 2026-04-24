"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { getAdminContext } from "@/lib/auth";
import { revalidatePath } from "next/cache";

function parseForm(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const sample_type = String(formData.get("sample_type") ?? "").trim() || null;
  const priceRaw = String(formData.get("price_inr") ?? "").trim();
  const price_inr = priceRaw === "" ? null : Number(priceRaw);
  const tatRaw = String(formData.get("turnaround_days") ?? "").trim();
  const turnaround_days = tatRaw === "" ? null : Number(tatRaw);
  const active = formData.get("active") === "on";
  const sort_order = Number(formData.get("sort_order") ?? 0);

  return {
    name,
    description,
    sample_type,
    price_inr,
    turnaround_days,
    active,
    sort_order,
  };
}

export async function createLabTest(formData: FormData) {
  const ctx = await getAdminContext();
  if (!ctx.activeChapterId) {
    throw new Error(
      "Pick a chapter from the sidebar before creating a lab test.",
    );
  }
  const svc = createServiceClient();
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  if (!code) throw new Error("Code is required");

  const payload = parseForm(formData);
  const { error } = await svc
    .from("lab_tests_catalog")
    .insert({ code, chapter_id: ctx.activeChapterId, ...payload });
  if (error) throw new Error(error.message);

  revalidatePath("/admin/lab-tests");
}

export async function updateLabTest(code: string, formData: FormData) {
  await getAdminContext();
  const svc = createServiceClient();
  const payload = parseForm(formData);
  const { error } = await svc
    .from("lab_tests_catalog")
    .update(payload)
    .eq("code", code);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/lab-tests");
}

export async function toggleLabTestActive(code: string, active: boolean) {
  await getAdminContext();
  const svc = createServiceClient();
  const { error } = await svc
    .from("lab_tests_catalog")
    .update({ active })
    .eq("code", code);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/lab-tests");
}

export async function deleteLabTest(code: string) {
  await getAdminContext();
  const svc = createServiceClient();
  const { error } = await svc
    .from("lab_tests_catalog")
    .delete()
    .eq("code", code);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/lab-tests");
}
