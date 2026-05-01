"use server";

/**
 * State-level booking action. Differs from the old per-chapter version in
 * three places:
 *   1. Caller MUST be a logged-in member — getAuthedMember() returns null
 *      otherwise and we redirect to the login gate.
 *   2. The chapter is chosen by the form (?chapter=…) so any signed-in member
 *      can book at any chapter's lab.
 *   3. We attach `member_id` to the booking row so the chapter admin sees who
 *      booked instead of just a name string.
 */

import { randomUUID } from "crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { getChapterBySlug } from "@/lib/chapter-loader";
import { getAuthedMember } from "@/lib/auth";
import { sendEmail, renderRows, escapeHtml } from "@/lib/email";
import { chapterAdmins } from "@/lib/notify";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function submitStateBooking(formData: FormData) {
  const member = await getAuthedMember();
  if (!member) {
    redirect("/login?next=" + encodeURIComponent("/lab/book"));
  }

  const slug = String(formData.get("chapter_slug") ?? "").trim();
  const chapter = await getChapterBySlug(slug);
  if (!chapter) {
    redirect("/lab?error=Unknown+chapter");
  }

  const base = `/lab/book?chapter=${slug}`;

  const name = str(formData.get("name"));
  const company = str(formData.get("company"));
  const email = str(formData.get("email"));
  const phone = str(formData.get("phone"));
  const sampleCountRaw = str(formData.get("sample_count"));
  const preferredDate = str(formData.get("preferred_date"));
  const notes = str(formData.get("notes"));
  const tests = formData.getAll("tests").map(String).filter(Boolean);

  if (!name) return fail(base, "Please provide your name.");
  if (!company) return fail(base, "Please provide your company name.");
  if (!email && !phone) return fail(base, "Provide an email or phone number.");
  if (tests.length === 0) return fail(base, "Pick at least one test.");

  const sampleCount = sampleCountRaw ? Number(sampleCountRaw) : null;

  const svc = createServiceClient();
  const { error } = await svc.from("bookings").insert({
    id: randomUUID(),
    chapter_id: chapter.id,
    member_id: member.id,
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

  // Two emails: confirmation to the booker, notification to the chapter
  // admins + lab desk (if office_info has a lab email). Best-effort.
  try {
    const labOffice = await svc
      .from("office_info")
      .select("email, lab_phone")
      .eq("chapter_id", chapter.id)
      .maybeSingle();

    const adminEmails = await chapterAdmins(chapter.id);
    const labEmail = labOffice.data?.email?.toLowerCase().trim();
    const internal = Array.from(
      new Set([...adminEmails, ...(labEmail ? [labEmail] : [])]),
    );

    const summary = renderRows([
      ["Member", `${name}${company ? ` (${company})` : ""}`],
      ["Chapter lab", chapter.name],
      ["Tests", tests.join(", ")],
      ["Sample count", sampleCount ? String(sampleCount) : "—"],
      ["Preferred drop-off", preferredDate || "—"],
      ["Email", email],
      ["Phone", phone],
    ]);

    // 1. Confirmation to the booker
    if (email) {
      await sendEmail({
        to: email,
        subject: `[UPCBMA Lab] Booking received — ${chapter.name}`,
        text: [
          `Hi ${name},`,
          ``,
          `Your lab booking at ${chapter.name} has been received.`,
          ``,
          `Tests:        ${tests.join(", ")}`,
          `Samples:      ${sampleCount ?? "—"}`,
          `Preferred:    ${preferredDate || "—"}`,
          ``,
          `The lab desk will be in touch to confirm the slot. Drop your samples at the desk after confirmation.`,
          ``,
          notes ? `Your notes: ${notes}\n` : "",
          `— UPCBMA ${chapter.name} lab desk`,
        ]
          .filter(Boolean)
          .join("\n"),
        html: `
          <p>Hi ${escapeHtml(name)},</p>
          <p>Your lab booking at <strong>${escapeHtml(chapter.name)}</strong> has been received.</p>
          ${summary}
          <p style="font-size:13px;margin-top:16px">The lab desk will be in touch to confirm the slot. Drop samples at the desk after confirmation.</p>
        `,
        tag: "booking_confirmation",
      });
    }

    // 2. Notification to chapter admins + lab desk
    if (internal.length > 0) {
      await sendEmail({
        to: internal,
        subject: `[Lab · ${chapter.name}] New booking from ${name}`,
        replyTo: email || undefined,
        text: [
          `New lab booking received.`,
          ``,
          `From:        ${name}${company ? ` (${company})` : ""}`,
          `Email:       ${email || "—"}`,
          `Phone:       ${phone || "—"}`,
          `Tests:       ${tests.join(", ")}`,
          `Samples:     ${sampleCount ?? "—"}`,
          `Preferred:   ${preferredDate || "—"}`,
          ``,
          notes ? `Notes: ${notes}\n` : "",
          `Confirm in /admin/bookings.`,
        ]
          .filter(Boolean)
          .join("\n"),
        html: `
          <p>New lab booking received.</p>
          ${summary}
          ${notes ? `<div style="margin-top:12px;padding:12px;border:1px solid #e2e8f0;border-radius:4px;background:#f8fafc;font-size:14px;line-height:1.6;white-space:pre-wrap">${escapeHtml(notes)}</div>` : ""}
          <p style="font-size:13px;margin-top:16px">Confirm in <a href="${process.env.NEXT_PUBLIC_SITE_URL ?? "https://upcbma.com"}/admin/bookings" style="color:#0d6b3e">/admin/bookings</a>.</p>
        `,
        tag: "booking_notification",
      });
    }
  } catch {
    /* swallow — booking row already saved */
  }

  revalidatePath("/admin/bookings");
  redirect(base + "&ok=1");
}

function str(v: FormDataEntryValue | null) {
  return (v == null ? "" : String(v)).trim();
}

function fail(base: string, message: string): never {
  redirect(`${base}&error=${encodeURIComponent(message)}`);
}
