"use server";

/**
 * Server actions for the super_admin Site Locks page.
 *
 * - createLock(): write a new active lock row.
 * - releaseLock(): mark a lock inactive (audit-friendly — we keep the row).
 *
 * All mutations require super_admin and append an entry to admin_audit_log.
 */

import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { resolveAuthIdentity, isSuperAdmin } from "@/lib/auth";

const LOCKS_PATH = "/admin/super/locks";

export async function createLock(formData: FormData) {
  const { real, effective } = await resolveAuthIdentity();
  if (!isSuperAdmin(real)) {
    redirect("/admin");
  }

  const scope = String(formData.get("scope") ?? "category") as
    | "global"
    | "category"
    | "row";
  const category =
    scope === "global"
      ? null
      : String(formData.get("category") ?? "").trim() || null;
  const chapterIdRaw = String(formData.get("chapter_id") ?? "").trim();
  const chapter_id = chapterIdRaw && chapterIdRaw !== "_all" ? chapterIdRaw : null;
  const resource_id =
    scope === "row"
      ? String(formData.get("resource_id") ?? "").trim() || null
      : null;
  const reason = String(formData.get("reason") ?? "").trim() || null;

  if (scope !== "global" && !category) {
    return fail("Pick a category.");
  }
  if (scope === "row" && !resource_id) {
    return fail("Provide the resource id (UUID) you want to lock.");
  }

  const svc = createServiceClient();
  const { error } = await svc.from("site_locks").insert({
    id: randomUUID(),
    scope,
    category,
    chapter_id,
    resource_id,
    reason,
    locked_by: effective.id,
    active: true,
  });
  if (error) return fail(error.message);

  // Best-effort audit log (table may not exist in dev — swallow errors).
  try {
    await svc.from("admin_audit_log").insert({
      id: randomUUID(),
      actor_id: real.id,
      effective_id: effective.id,
      action: "site_lock.create",
      target: `${scope}:${category ?? "—"}:${chapter_id ?? "—"}:${resource_id ?? "—"}`,
      meta: { reason },
      created_at: new Date().toISOString(),
    } as any);
  } catch {}

  revalidatePath(LOCKS_PATH);
  redirect(LOCKS_PATH + "?ok=1");
}

export async function releaseLock(formData: FormData) {
  const { real, effective } = await resolveAuthIdentity();
  if (!isSuperAdmin(real)) redirect("/admin");

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return fail("Missing lock id.");

  const svc = createServiceClient();
  const { error } = await svc
    .from("site_locks")
    .update({ active: false, unlocked_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return fail(error.message);

  try {
    await svc.from("admin_audit_log").insert({
      id: randomUUID(),
      actor_id: real.id,
      effective_id: effective.id,
      action: "site_lock.release",
      target: id,
      created_at: new Date().toISOString(),
    } as any);
  } catch {}

  revalidatePath(LOCKS_PATH);
  redirect(LOCKS_PATH + "?ok=2");
}

function fail(m: string): never {
  redirect(LOCKS_PATH + `?error=${encodeURIComponent(m)}`);
}
