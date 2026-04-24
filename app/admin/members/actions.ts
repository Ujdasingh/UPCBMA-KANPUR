"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { assertCanMutateMember, getAuthedAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// Shape formData to the members table's Insert/Update payload.
function parseMemberForm(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const company = String(formData.get("company") ?? "").trim() || null;
  const category = String(formData.get("category") ?? "Member") as
    | "Member"
    | "Executive";
  const role = String(formData.get("role") ?? "member") as
    | "member"
    | "admin"
    | "super_admin";
  const memberSinceRaw = String(formData.get("member_since") ?? "").trim();
  const active = formData.get("active") === "on";

  return {
    name,
    email,
    phone,
    company,
    category,
    role,
    active,
    member_since: memberSinceRaw || new Date().toISOString().slice(0, 10),
  };
}

export async function createMember(formData: FormData) {
  const me = await getAuthedAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Member ID is required");
  const payload = parseMemberForm(formData);

  await assertCanMutateMember({ caller: me, incomingRole: payload.role });

  // Use service client so the insert isn't subject to RLS policies that may
  // block writes against protected role columns.
  const svc = createServiceClient();
  const { error } = await svc.from("members").insert({ id, ...payload });
  if (error) throw new Error(error.message);

  revalidatePath("/admin/members");
}

export async function updateMember(id: string, formData: FormData) {
  const me = await getAuthedAdmin();
  const payload = parseMemberForm(formData);

  await assertCanMutateMember({
    caller: me,
    targetId: id,
    incomingRole: payload.role,
  });

  const svc = createServiceClient();
  const { error } = await svc.from("members").update(payload).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/members");
}

export async function toggleMemberActive(id: string, active: boolean) {
  const me = await getAuthedAdmin();
  await assertCanMutateMember({ caller: me, targetId: id });

  const svc = createServiceClient();
  const { error } = await svc.from("members").update({ active }).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/members");
}

export async function deleteMember(id: string) {
  const me = await getAuthedAdmin();
  await assertCanMutateMember({ caller: me, targetId: id });

  // Block deleting your own member row as a safety net.
  const svc = createServiceClient();
  const { data: target } = await svc
    .from("members")
    .select("auth_user_id")
    .eq("id", id)
    .maybeSingle();
  if (target?.auth_user_id === me.auth_user_id) {
    throw new Error("You cannot delete your own account.");
  }

  const { error } = await svc.from("members").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/members");
}
