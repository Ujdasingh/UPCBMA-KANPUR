"use server";

/**
 * Self-serve profile editor — name, phone, company, quote, photo. Any
 * signed-in member can call this; super_admin role isn't a requirement
 * because they're only modifying their own row.
 */

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { getAuthedMember } from "@/lib/auth";

export async function updateMyProfile(formData: FormData) {
  const me = await getAuthedMember();
  if (!me) redirect("/login?next=/me");

  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const company = String(formData.get("company") ?? "").trim() || null;
  const quote = String(formData.get("quote") ?? "").trim().slice(0, 240) || null;
  const photoRaw = String(formData.get("photo_url") ?? "").trim();
  const photo_url =
    photoRaw && /^https?:\/\//i.test(photoRaw) ? photoRaw : null;

  if (!name) return fail("Name can't be empty.");

  const svc = createServiceClient();
  const { error } = await svc
    .from("members")
    .update({ name, phone, company, quote, photo_url })
    .eq("id", me.id);

  if (error) return fail(error.message);

  // Refresh anything that displays member info — chapter committee section
  // pulls name + photo + quote, and /me itself shows the avatar.
  revalidatePath("/me");
  revalidatePath("/me/profile");

  redirect("/me/profile?ok=" + encodeURIComponent("Profile updated."));
}

function fail(m: string): never {
  redirect("/me/profile?error=" + encodeURIComponent(m));
}
