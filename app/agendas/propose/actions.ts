"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { getAuthedMember } from "@/lib/auth";
import { sendEmail, renderRows, escapeHtml } from "@/lib/email";
import { chapterAdmins, stateAdmins } from "@/lib/notify";
import { slugifyAgenda } from "@/lib/agendas";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function proposeAgenda(formData: FormData) {
  const me = await getAuthedMember();
  if (!me) {
    redirect("/login?next=/agendas/propose");
  }

  const title = String(formData.get("title") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim() || null;
  const body = String(formData.get("body") ?? "").trim() || null;
  const category = String(formData.get("category") ?? "other");
  const image_url = String(formData.get("image_url") ?? "").trim() || null;
  const chapterIdRaw = String(formData.get("chapter_id") ?? "").trim();
  const chapter_id = chapterIdRaw === "" ? null : chapterIdRaw;

  if (!title) {
    redirect(
      "/agendas/propose?error=" + encodeURIComponent("Title is required."),
    );
  }

  const slug = slugifyAgenda(title) + "-" + Math.random().toString(36).slice(2, 6);

  const svc = createServiceClient();
  const { error } = await svc.from("agendas").insert({
    slug,
    chapter_id,
    category,
    status: "active",
    priority: "medium",
    visibility: "public",
    approval_status: "pending",
    title,
    summary,
    body,
    image_url,
    created_by: me.id,
  });

  if (error) {
    redirect("/agendas/propose?error=" + encodeURIComponent(error.message));
  }

  // Audit row + admin notification.
  await svc
    .from("admin_audit_log")
    .insert({
      actor_id: me.id,
      action: "propose_agenda",
      target_table: "agendas",
      target_id: slug,
      diff: { title, chapter_id },
    })
    .then(() => null)
    .catch(() => null);

  try {
    const recipients = chapter_id
      ? await chapterAdmins(chapter_id)
      : await stateAdmins();

    if (recipients.length > 0) {
      const chapterName = chapter_id
        ? (
            await svc
              .from("chapters")
              .select("name")
              .eq("id", chapter_id)
              .maybeSingle()
          ).data?.name ?? "(chapter)"
        : "Statewide";

      const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL ?? "https://upcbma.com";

      await sendEmail({
        to: recipients,
        subject: `[Agenda · ${chapterName}] Pending approval: ${title}`,
        replyTo: me.email,
        text: [
          `${me.name} just proposed an agenda for ${chapterName}.`,
          ``,
          `Title:    ${title}`,
          `Category: ${category}`,
          summary ? `\nSummary:\n${summary}` : "",
          ``,
          `Approve / reject: ${siteUrl}/admin/agendas`,
        ]
          .filter(Boolean)
          .join("\n"),
        html: `
          <p><strong>${escapeHtml(me.name)}</strong> just proposed an agenda for <strong>${escapeHtml(chapterName)}</strong>.</p>
          ${renderRows([
            ["Title", title],
            ["Category", category],
          ])}
          ${summary ? `<div style="margin-top:12px;padding:12px;border:1px solid #e2e8f0;border-radius:4px;background:#f8fafc;font-size:14px;line-height:1.6;white-space:pre-wrap">${escapeHtml(summary)}</div>` : ""}
          <p style="font-size:13px;margin-top:16px">Approve or reject in <a href="${siteUrl}/admin/agendas" style="color:#0d6b3e">/admin/agendas</a>.</p>
        `,
        tag: "agenda_proposed",
      });
    }
  } catch {
    /* swallow */
  }

  revalidatePath("/admin/agendas");
  redirect("/agendas/propose?ok=1");
}
