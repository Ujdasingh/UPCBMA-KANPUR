"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

function str(v: FormDataEntryValue | null) {
  return (v == null ? "" : String(v)).trim();
}

export async function submitMembershipRequest(formData: FormData) {
  const name = str(formData.get("name"));
  const email = str(formData.get("email"));
  const phone = str(formData.get("phone"));
  const company = str(formData.get("company"));
  const city = str(formData.get("city"));
  const state = str(formData.get("state"));
  const categoryPref = str(formData.get("category_preference"));
  const capacity = str(formData.get("manufacturing_capacity"));
  const notes = str(formData.get("notes"));
  const chapterIdRaw = str(formData.get("chapter_id"));
  const chapter_id = chapterIdRaw === "" ? null : chapterIdRaw;

  if (!name) return fail("Please share your full name.");
  if (!email) return fail("An email address is required so we can reach back.");
  if (!company) return fail("Please share your company name.");

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null;
  const ua = h.get("user-agent") ?? null;

  const svc = createServiceClient();
  const { error } = await svc.from("membership_requests").insert({
    name,
    email,
    phone: phone || null,
    company,
    city: city || null,
    state: state || null,
    category_preference: categoryPref || null,
    manufacturing_capacity: capacity || null,
    notes: notes || null,
    chapter_id,
    status: "new",
    ip_address: ip,
    user_agent: ua,
  });

  if (error) return fail("Could not save your request: " + error.message);

  revalidatePath("/admin/membership-requests");
  redirect("/join?ok=1");
}

function fail(message: string): never {
  redirect("/join?error=" + encodeURIComponent(message));
}
