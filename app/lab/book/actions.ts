"use server";

import { randomUUID } from "crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

/**
 * Public booking action — a visitor posts this form from /lab/book.
 * We use the service role client (server-only, bypasses RLS) because the
 * visitor is anonymous and the `bookings` table is otherwise protected.
 */
export async function submitBooking(formData: FormData) {
  const name = str(formData.get("name"));
  const company = str(formData.get("company"));
  const email = str(formData.get("email"));
  const phone = str(formData.get("phone"));
  const sampleCountRaw = str(formData.get("sample_count"));
  const preferredDate = str(formData.get("preferred_date"));
  const notes = str(formData.get("notes"));
  const tests = formData.getAll("tests").map(String).filter(Boolean);

  if (!name) return redirectWithError("Please provide your name.");
  if (!company) return redirectWithError("Please provide your company name.");
  if (!email && !phone) {
    return redirectWithError("Please provide either an email or phone number.");
  }
  if (tests.length === 0) {
    return redirectWithError("Please pick at least one test.");
  }

  const sampleCount = sampleCountRaw ? Number(sampleCountRaw) : null;

  const supabase = createServiceClient();

  // Combine name/company/contact into member_* fields (no login required).
  const { error } = await supabase.from("bookings").insert({
    id: randomUUID(),
    member_id: null,
    member_name: name,
    member_company: company,
    tests,
    sample_count: sampleCount,
    preferred_date: preferredDate || null,
    notes: notes ? `Email: ${email || "—"} | Phone: ${phone || "—"}\n\n${notes}` : `Email: ${email || "—"} | Phone: ${phone || "—"}`,
    status: "pending",
    submitted_at: new Date().toISOString(),
  });

  if (error) {
    return redirectWithError("Could not submit your booking: " + error.message);
  }

  revalidatePath("/admin/bookings");
  redirect("/lab/book?ok=1");
}

function str(v: FormDataEntryValue | null) {
  return (v == null ? "" : String(v)).trim();
}

function redirectWithError(message: string): never {
  const q = new URLSearchParams({ error: message });
  redirect(`/lab/book?${q.toString()}`);
}
