"use server";

import { randomUUID } from "crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { sendEmail, renderRows, escapeHtml } from "@/lib/email";
import { secretariat } from "@/lib/notify";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

/**
 * Public contact action — captures name/email/phone/company/subject/message.
 * Writes to contact_messages with status="new" so the admin sees it in the
 * Messages inbox, then notifies the secretariat by email (best-effort).
 */
export async function submitContact(formData: FormData) {
  const name = str(formData.get("name"));
  const email = str(formData.get("email"));
  const phone = str(formData.get("phone"));
  const company = str(formData.get("company"));
  const subject = str(formData.get("subject"));
  const message = str(formData.get("message"));

  if (!name) return redirectWithError("Please provide your name.");
  if (!email && !phone) return redirectWithError("Please provide email or phone.");
  if (!message) return redirectWithError("Please write a message.");

  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    null;
  const ua = h.get("user-agent") ?? null;

  const supabase = createServiceClient();
  const { error } = await supabase.from("contact_messages").insert({
    id: randomUUID(),
    name,
    email: email || null,
    phone: phone || null,
    company: company || null,
    subject: subject || null,
    message,
    status: "new",
    created_at: new Date().toISOString(),
    ip_address: ip,
    user_agent: ua,
  });

  if (error) {
    return redirectWithError("Could not send your message: " + error.message);
  }

  // Notify secretariat — best-effort; never blocks the redirect.
  try {
    const recipients = await secretariat();
    if (recipients.length > 0) {
      await sendEmail({
        to: recipients,
        subject: `[UPCBMA contact] ${subject || "New message"}`,
        replyTo: email || undefined,
        text: [
          `New contact-form submission.`,
          ``,
          `From:    ${name}${company ? ` (${company})` : ""}`,
          `Email:   ${email || "—"}`,
          `Phone:   ${phone || "—"}`,
          `Subject: ${subject || "—"}`,
          ``,
          message,
          ``,
          `Triage in /admin/messages.`,
        ].join("\n"),
        html: `
          <p>New contact-form submission.</p>
          ${renderRows([
            ["From", `${name}${company ? ` (${company})` : ""}`],
            ["Email", email],
            ["Phone", phone],
            ["Subject", subject],
          ])}
          <div style="margin-top:12px;padding:12px;border:1px solid #e2e8f0;border-radius:4px;background:#f8fafc;font-size:14px;line-height:1.6;white-space:pre-wrap">${escapeHtml(message)}</div>
          <p style="font-size:12px;color:#64748b;margin-top:16px">Triage in <a href="${process.env.NEXT_PUBLIC_SITE_URL ?? "https://upcbma.com"}/admin/messages" style="color:#0d6b3e">/admin/messages</a>.</p>
        `,
        tag: "contact_state",
      });
    }
  } catch {
    /* swallow — message already saved to DB */
  }

  revalidatePath("/admin/messages");
  redirect("/contact?ok=1");
}

function str(v: FormDataEntryValue | null) {
  return (v == null ? "" : String(v)).trim();
}

function redirectWithError(message: string): never {
  redirect(`/contact?${new URLSearchParams({ error: message }).toString()}`);
}
