"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { resolveAuthIdentity, isSuperAdmin } from "@/lib/auth";
import { IMPERSONATE_COOKIE } from "@/lib/impersonate";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

/**
 * Start impersonating a target member. Only super_admin can do this.
 * Writes an audit row.
 */
export async function startImpersonation(formData: FormData) {
  const targetId = String(formData.get("target_id") ?? "").trim();
  if (!targetId) redirect("/admin/super/impersonate?error=Missing+target");

  const { real } = await resolveAuthIdentity();
  if (!isSuperAdmin(real)) redirect("/");

  // Refuse to impersonate another super_admin (edge case)
  const svc = createServiceClient();
  const { data: target } = await svc
    .from("members")
    .select("id, role, name")
    .eq("id", targetId)
    .maybeSingle();
  if (!target) redirect("/admin/super/impersonate?error=Unknown+member");

  if (target.role === "super_admin" && target.id !== real.id) {
    redirect("/admin/super/impersonate?error=Cannot+impersonate+another+super_admin");
  }

  const cookieStore = await cookies();
  cookieStore.set(IMPERSONATE_COOKIE, targetId, {
    path: "/admin",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 2, // 2 hours
  });

  await svc.from("admin_audit_log").insert({
    actor_id: real.id,
    acting_as_id: targetId,
    action: "start_impersonation",
    target_table: "members",
    target_id: targetId,
  });

  revalidatePath("/admin", "layout");
  redirect("/admin");
}

export async function stopImpersonation() {
  const { real } = await resolveAuthIdentity();
  if (!isSuperAdmin(real)) redirect("/");

  const cookieStore = await cookies();
  const current = cookieStore.get(IMPERSONATE_COOKIE)?.value;
  cookieStore.delete(IMPERSONATE_COOKIE);

  if (current) {
    const svc = createServiceClient();
    await svc.from("admin_audit_log").insert({
      actor_id: real.id,
      acting_as_id: current,
      action: "stop_impersonation",
    });
  }

  revalidatePath("/admin", "layout");
  redirect("/admin/super");
}

export async function grantScope(formData: FormData) {
  const memberId = String(formData.get("member_id") ?? "").trim();
  const chapterIdRaw = String(formData.get("chapter_id") ?? "").trim();
  const chapterId = chapterIdRaw === "" ? null : chapterIdRaw;

  if (!memberId) redirect("/admin/super/admin-scopes?error=Missing+member");

  const { real } = await resolveAuthIdentity();
  if (!isSuperAdmin(real)) redirect("/");

  const svc = createServiceClient();
  const { error } = await svc.from("admin_scopes").insert({
    member_id: memberId,
    chapter_id: chapterId,
    granted_by: real.id,
  });
  if (error) {
    redirect("/admin/super/admin-scopes?error=" + encodeURIComponent(error.message));
  }
  await svc.from("admin_audit_log").insert({
    actor_id: real.id,
    action: "grant_admin_scope",
    target_table: "admin_scopes",
    target_id: memberId,
    diff: { chapter_id: chapterId },
  });
  revalidatePath("/admin/super/admin-scopes");
  redirect("/admin/super/admin-scopes?ok=Scope+granted");
}

export async function revokeScope(scopeId: string) {
  const { real } = await resolveAuthIdentity();
  if (!isSuperAdmin(real)) redirect("/");

  const svc = createServiceClient();
  const { error } = await svc.from("admin_scopes").delete().eq("id", scopeId);
  if (error) {
    redirect("/admin/super/admin-scopes?error=" + encodeURIComponent(error.message));
  }
  await svc.from("admin_audit_log").insert({
    actor_id: real.id,
    action: "revoke_admin_scope",
    target_table: "admin_scopes",
    target_id: scopeId,
  });
  revalidatePath("/admin/super/admin-scopes");
  redirect("/admin/super/admin-scopes?ok=Scope+revoked");
}
