"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { resolveAuthIdentity, isSuperAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function saveSiteSetting(formData: FormData) {
  const { real } = await resolveAuthIdentity();
  if (!isSuperAdmin(real)) redirect("/admin");

  const key = String(formData.get("key") ?? "").trim();
  const value = String(formData.get("value") ?? "").trim();
  if (!key) {
    redirect("/admin/super/site-settings?error=Missing+key");
  }

  const svc = createServiceClient();
  const { error } = await svc
    .from("site_settings")
    .upsert(
      { key, value: value || null, updated_at: new Date().toISOString(), updated_by: real.id },
      { onConflict: "key" },
    );

  if (error) {
    redirect(
      "/admin/super/site-settings?error=" +
        encodeURIComponent(error.message),
    );
  }

  await svc.from("admin_audit_log").insert({
    actor_id: real.id,
    action: "save_site_setting",
    target_table: "site_settings",
    target_id: key,
    diff: { value: value || null },
  });

  // Re-render every public page that reads logo / settings.
  revalidatePath("/", "layout");
  redirect("/admin/super/site-settings?ok=Setting+saved");
}
