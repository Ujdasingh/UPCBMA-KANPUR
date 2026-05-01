"use server";

/**
 * Server action for the chapter-page "Raise a problem" form.
 *
 * Pipeline:
 *  1. Resolve chapter from slug (validates the form wasn't tampered with).
 *  2. Insert a row in `contact_messages` with kind='problem' and chapter_id set
 *     so the chapter admin sees it in /admin/messages.
 *  3. Email the active committee for that chapter so they get notified
 *     immediately (best-effort — never blocks the user-facing redirect).
 *  4. Redirect back to the chapter page with ?ok=1 (or ?error=…).
 */

import { randomUUID } from "crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { getChapterBySlug } from "@/lib/chapter-loader";
import { sendEmail, renderRows, escapeHtml } from "@/lib/email";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function submitChapterProblem(formData: FormData) {
  const slug = String(formData.get("chapter_slug") ?? "").trim();
  const chapter = await getChapterBySlug(slug);
  if (!chapter) redirect("/chapters?error=Unknown+chapter");

  const failBase = `/${slug}`;

  const name = str(formData.get("name"));
  const email = str(formData.get("email"));
  const phone = str(formData.get("phone"));
  const company = str(formData.get("company"));
  const subject = str(formData.get("subject"));
  const message = str(formData.get("message"));

  if (!name) return fail(failBase, "Please provide your name.");
  if (!subject) return fail(failBase, "Please provide a one-line subject.");
  if (!email && !phone)
    return fail(failBase, "Provide an email or phone so the committee can reply.");
  if (!message) return fail(failBase, "Please describe the problem.");

  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null;
  const ua = h.get("user-agent") ?? null;

  const svc = createServiceClient();
  const { error } = await svc.from("contact_messages").insert({
    id: randomUUID(),
    chapter_id: chapter.id,
    kind: "problem",
    name,
    email: email || null,
    phone: phone || null,
    company: company || null,
    subject,
    message,
    status: "new",
    created_at: new Date().toISOString(),
    ip_address: ip,
    user_agent: ua,
  });

  if (error) return fail(failBase, "Could not send: " + error.message);

  // Notify the chapter committee. We pull the active appointment roster and
  // dedupe by email — failures are swallowed so a flaky inbox doesn't block
  // the user (the row is already in the DB regardless).
  await notifyCommittee({
    chapterId: chapter.id,
    chapterName: chapter.name,
    submitter: { name, email, phone, company },
    subject,
    message,
    replyTo: email || undefined,
  }).catch(() => null);

  revalidatePath("/admin/messages");
  revalidatePath(`/${slug}`);
  redirect(`/${slug}?ok=1#raise-problem`);
}

async function notifyCommittee(opts: {
  chapterId: string;
  chapterName: string;
  submitter: { name: string; email: string; phone: string; company: string };
  subject: string;
  message: string;
  replyTo?: string;
}) {
  const svc = createServiceClient();
  const { data: rows } = await svc
    .from("committee_appointments")
    .select("member:members(email, role)")
    .eq("chapter_id", opts.chapterId)
    .eq("status", "active");

  const emails = Array.from(
    new Set(
      (rows ?? [])
        .map((r) => {
          const m = Array.isArray(r.member) ? r.member[0] : r.member;
          // Skip super_admins — they shouldn't surface from public flows.
          if (!m || m.role === "super_admin") return null;
          return m.email?.toLowerCase() ?? null;
        })
        .filter((e): e is string => !!e),
    ),
  );

  if (emails.length === 0) return; // nothing to notify

  const text = [
    `A new "Raise a problem" submission was just logged for ${opts.chapterName}.`,
    ``,
    `From:    ${opts.submitter.name}${opts.submitter.company ? ` (${opts.submitter.company})` : ""}`,
    `Email:   ${opts.submitter.email || "—"}`,
    `Phone:   ${opts.submitter.phone || "—"}`,
    ``,
    `Subject: ${opts.subject}`,
    ``,
    opts.message,
    ``,
    `Reply by hitting reply (goes to the submitter), or triage in /admin/messages.`,
  ].join("\n");

  const html = `
    <p>A new <strong>Raise a problem</strong> submission was just logged for <strong>${escapeHtml(opts.chapterName)}</strong>.</p>
    ${renderRows([
      ["From", `${opts.submitter.name}${opts.submitter.company ? ` (${opts.submitter.company})` : ""}`],
      ["Email", opts.submitter.email],
      ["Phone", opts.submitter.phone],
      ["Subject", opts.subject],
    ])}
    <div style="margin-top:12px;padding:12px;border:1px solid #e2e8f0;border-radius:4px;background:#f8fafc;font-size:14px;line-height:1.6;white-space:pre-wrap">${escapeHtml(opts.message)}</div>
    <p style="font-size:12px;color:#64748b;margin-top:16px">Hit reply to respond directly to the submitter — or triage in <a href="${process.env.NEXT_PUBLIC_SITE_URL ?? "https://upcbma.com"}/admin/messages" style="color:#0d6b3e">/admin/messages</a>.</p>
  `;

  await sendEmail({
    to: emails,
    subject: `[${opts.chapterName}] Problem reported: ${opts.subject}`,
    text,
    html,
    replyTo: opts.replyTo,
    tag: "raise_problem",
  });
}

function str(v: FormDataEntryValue | null) {
  return (v == null ? "" : String(v)).trim();
}

function fail(base: string, m: string): never {
  redirect(`${base}?error=${encodeURIComponent(m)}#raise-problem`);
}
