"use server";

import { randomUUID } from "crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { getChapterBySlug } from "@/lib/chapter-loader";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function submitChapterContact(formData: FormData) {
  const slug = String(formData.get("chapter_slug") ?? "").trim();
  const chapter = await getChapterBySlug(slug);
  if (!chapter) redirect("/chapters?error=Unknown+chapter");

  const base = `/${slug}/contact`;

  const name = str(formData.get("name"));
  const email = str(formData.get("email"));
  const phone = str(formData.get("phone"));
  const company = str(formData.get("company"));
  const subject = str(formData.get("subject"));
  const message = str(formData.get("message"));

  if (!name) return fail(base, "Please provide your name.");
  if (!email && !phone) return fail(base, "Provide an email or phone.");
  if (!message) return fail(base, "Please write a message.");

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null;
  const ua = h.get("user-agent") ?? null;

  const svc = createServiceClient();
  const { error } = await svc.from("contact_messages").insert({
    id: randomUUID(),
    chapter_id: chapter.id,
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

  if (error) return fail(base, "Could not send message: " + error.message);

  revalidatePath("/admin/messages");
  redirect(base + "?ok=1");
}

function str(v: FormDataEntryValue | null) {
  return (v == null ? "" : String(v)).trim();
}

function fail(base: string, m: string): never {
  redirect(`${base}?error=${encodeURIComponent(m)}`);
}
