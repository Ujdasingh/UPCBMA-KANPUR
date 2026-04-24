"use server";

import { randomUUID } from "crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { getChapterBySlug } from "@/lib/chapter-loader";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function submitChapterBooking(formData: FormData) {
  const slug = String(formData.get("chapter_slug") ?? "").trim();
  const chapter = await getChapterBySlug(slug);
  if (!chapter) {
    redirect("/chapters?error=Unknown+chapter");
  }

  const name = str(formData.get("name"));
  const company = str(formData.get("company"));
  const email = str(formData.get("email"));
  const phone = str(formData.get("phone"));
  const sampleCountRaw = str(formData.get("sample_count"));
  const preferredDate = str(formData.get("preferred_date"));
  const notes = str(formData.get("notes"));
  const tests = formData.getAll("tests").map(String).filter(Boolean);

  const base = `/${slug}/lab/book`;
  if (!name) return fail(base, "Please provide your name.");
  if (!company) return fail(base, "Please provide your company name.");
  if (!email && !phone) return fail(base, "Provide an email or phone number.");
  if (tests.length === 0) return fail(base, "Pick at least one test.");

  const sampleCount = sampleCountRaw ? Number(sampleCountRaw) : null;

  const svc = createServiceClient();
  const { error } = await svc.from("bookings").insert({
    id: randomUUID(),
    chapter_id: chapter.id,
    member_id: null,
    member_name: name,
    member_company: company,
    tests,
    sample_count: sampleCount,
    preferred_date: preferredDate || null,
    notes:
      `Email: ${email || "—"} | Phone: ${phone || "—"}` +
      (notes ? `\n\n${notes}` : ""),
    status: "pending",
    submitted_at: new Date().toISOString(),
  });

  if (error) return fail(base, "Could not submit booking: " + error.message);

  revalidatePath("/admin/bookings");
  redirect(base + "?ok=1");
}

function str(v: FormDataEntryValue | null) {
  return (v == null ? "" : String(v)).trim();
}

function fail(base: string, message: string): never {
  redirect(`${base}?error=${encodeURIComponent(message)}`);
}
