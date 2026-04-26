"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { getAuthedMember } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function postComment(formData: FormData) {
  const me = await getAuthedMember();
  const slug = String(formData.get("slug") ?? "").trim();
  if (!slug) redirect("/agendas");

  if (!me) {
    redirect(`/login?next=${encodeURIComponent("/agendas/" + slug)}`);
  }

  const body = String(formData.get("body") ?? "").trim();
  if (!body) {
    redirect(`/agendas/${slug}?error=` + encodeURIComponent("Comment can't be empty."));
  }

  const svc = createServiceClient();
  const { data: agenda } = await svc
    .from("agendas")
    .select("id, approval_status")
    .eq("slug", slug)
    .maybeSingle();
  if (!agenda || agenda.approval_status !== "approved") {
    redirect("/agendas");
  }

  const { error } = await svc.from("agenda_comments").insert({
    agenda_id: agenda.id,
    member_id: me.id,
    body,
  });
  if (error) {
    redirect(`/agendas/${slug}?error=` + encodeURIComponent(error.message));
  }

  revalidatePath(`/agendas/${slug}`);
  redirect(`/agendas/${slug}#comments`);
}
