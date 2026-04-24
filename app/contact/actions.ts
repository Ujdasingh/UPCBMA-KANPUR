"use server";

import { randomUUID } from "crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

/**
 * Public contact action — captures name/email/phone/company/subject/message.
 * Writes to contact_messages with status="new" so the admin sees it in the
 * Messages inbox. Uses the service role client because the visitor is
 * anonymous and contact_messages is RLS-protected against anon inserts.
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
    return redirectWithError(
      "Could not send your message: " + error.message,
    );
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
