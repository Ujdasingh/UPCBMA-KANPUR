"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { sendEmail, renderRows, escapeHtml } from "@/lib/email";
import { chapterAdmins, stateAdmins } from "@/lib/notify";
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

  // Notify the right admins. If they picked a chapter, route to that chapter's
  // admins (plus state admins); otherwise send to the state queue.
  try {
    const recipients = chapter_id
      ? await chapterAdmins(chapter_id)
      : await stateAdmins();

    if (recipients.length > 0) {
      const chapterName = chapter_id
        ? (await svc
            .from("chapters")
            .select("name")
            .eq("id", chapter_id)
            .maybeSingle()).data?.name ?? "(chapter)"
        : "Statewide";

      await sendEmail({
        to: recipients,
        subject: `[UPCBMA join] ${name} from ${company}`,
        replyTo: email,
        text: [
          `New membership request — ${chapterName}.`,
          ``,
          `From:        ${name}`,
          `Company:     ${company}`,
          `City/State:  ${city || "—"}, ${state || "—"}`,
          `Email:       ${email}`,
          `Phone:       ${phone || "—"}`,
          `Category:    ${categoryPref || "—"}`,
          `Capacity:    ${capacity || "—"}`,
          ``,
          notes ? `Notes:\n${notes}\n` : "",
          `Approve / reject in /admin/membership-requests.`,
        ].filter(Boolean).join("\n"),
        html: `
          <p>New membership request — <strong>${escapeHtml(chapterName)}</strong>.</p>
          ${renderRows([
            ["From", name],
            ["Company", company],
            ["City / State", `${city || "—"}, ${state || "—"}`],
            ["Email", email],
            ["Phone", phone],
            ["Category", categoryPref],
            ["Capacity", capacity],
          ])}
          ${notes ? `<div style="margin-top:12px;padding:12px;border:1px solid #e2e8f0;border-radius:4px;background:#f8fafc;font-size:14px;line-height:1.6;white-space:pre-wrap">${escapeHtml(notes)}</div>` : ""}
          <p style="font-size:12px;color:#64748b;margin-top:16px">Approve / reject in <a href="${process.env.NEXT_PUBLIC_SITE_URL ?? "https://upcbma.com"}/admin/membership-requests" style="color:#0d6b3e">/admin/membership-requests</a>.</p>
        `,
        tag: "membership_request",
      });
    }
  } catch {
    /* swallow — request already saved */
  }

  revalidatePath("/admin/membership-requests");
  redirect("/join?ok=1");
}

function fail(message: string): never {
  redirect("/join?error=" + encodeURIComponent(message));
}
