"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { getAdminContext } from "@/lib/auth";
import { revalidatePath } from "next/cache";

/**
 * office_info has one row per chapter (UNIQUE (chapter_id)). Upsert on chapter_id
 * so saving works on first-time setup AND edit.
 */
export async function saveOfficeInfo(formData: FormData) {
  const ctx = await getAdminContext();
  if (!ctx.activeChapterId) {
    throw new Error("Pick a chapter from the sidebar before saving office info.");
  }
  const svc = createServiceClient();

  const payload = {
    chapter_id: ctx.activeChapterId,
    phone: String(formData.get("phone") ?? "").trim() || null,
    lab_phone: String(formData.get("lab_phone") ?? "").trim() || null,
    email: String(formData.get("email") ?? "").trim() || null,
    address: String(formData.get("address") ?? "").trim() || null,
    hours: String(formData.get("hours") ?? "").trim() || null,
    lab_contact_name:
      String(formData.get("lab_contact_name") ?? "").trim() || null,
    lab_contact_role:
      String(formData.get("lab_contact_role") ?? "").trim() || null,
    lab_billing_model:
      String(formData.get("lab_billing_model") ?? "").trim() || null,
  };

  const { error } = await svc
    .from("office_info")
    .upsert(payload, { onConflict: "chapter_id" });
  if (error) throw new Error(error.message);

  // Revalidate chapter-scoped public pages too (added in Round 3).
  revalidatePath("/admin/office-info");
  revalidatePath("/lab");
  revalidatePath("/contact");
  if (ctx.activeChapter?.slug) {
    revalidatePath(`/${ctx.activeChapter.slug}`);
    revalidatePath(`/${ctx.activeChapter.slug}/lab`);
    revalidatePath(`/${ctx.activeChapter.slug}/contact`);
  }
}
