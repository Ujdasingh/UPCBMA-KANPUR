"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { getAuthedAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

/**
 * Self-service profile update — an admin editing their OWN members row.
 * Does NOT touch auth.users.email (the login identifier). Only updates the
 * personal / communication email + display fields.
 */
export async function updateMyProfile(formData: FormData) {
  const me = await getAuthedAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const company = String(formData.get("company") ?? "").trim() || null;

  if (!name) {
    redirect("/admin/profile?error=" + encodeURIComponent("Name is required."));
  }
  if (!email) {
    redirect("/admin/profile?error=" + encodeURIComponent("Contact email is required."));
  }

  const svc = createServiceClient();
  const { error } = await svc
    .from("members")
    .update({ name, email, phone, company })
    .eq("id", me.id);

  if (error) {
    redirect("/admin/profile?error=" + encodeURIComponent(error.message));
  }

  // Make sure other pages re-read the updated name (e.g. sidebar "Signed in as").
  revalidatePath("/admin");
  revalidatePath("/admin/members");
  revalidatePath("/admin/profile");
  redirect("/admin/profile?ok=1");
}
