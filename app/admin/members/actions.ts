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

  const hasLogin = formData.get("has_login") === "on";
  const loginEmail = String(formData.get("login_email") ?? "")
    .trim()
    .toLowerCase();
  const initialPassword = String(formData.get("initial_password") ?? "");

  const svc = createServiceClient();
  let authUserId: string | null = null;

  if (hasLogin) {
    if (!loginEmail) {
      throw new Error(
        "Login email is required when giving this member login access.",
      );
    }
    if (!initialPassword || initialPassword.length < 8) {
      throw new Error(
        "Initial password must be at least 8 characters long.",
      );
    }
    // Members without a login must not have admin/super_admin roles.
    // Members WITH a login can be any role permitted by assertCanMutateMember.
    const { data: authData, error: authError } = await svc.auth.admin.createUser({
      email: loginEmail,
      password: initialPassword,
      email_confirm: true, // no SMTP yet — skip verification
    });
    if (authError || !authData?.user) {
      throw new Error(
        "Could not create login account: " +
          (authError?.message ?? "unknown error"),
      );
    }
    authUserId = authData.user.id;
  } else {
    // No-login members are forced to the baseline `member` role.
    payload.role = "member";
  }

  const { error } = await svc
    .from("members")
    .insert({ id, ...payload, auth_user_id: authUserId });

  if (error) {
    // Roll back the auth user so we don't leave an orphan login.
    if (authUserId) {
      await svc.auth.admin.deleteUser(authUserId).catch(() => {});
    }
    throw new Error(error.message);
  }

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

  // Edits never touch auth.users.email. The login identifier is fixed once
  // the account is created; to change it use Supabase auth admin directly.
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

  const svc = createServiceClient();
  const { data: target } = await svc
    .from("members")
    .select("auth_user_id")
    .eq("id", id)
    .maybeSingle();

  if (target?.auth_user_id === me.auth_user_id) {
    throw new Error("You cannot delete your own account.");
  }

  // Delete the DB row. If the member had a linked auth user, clean that up
  // too so we don't leave orphaned logins.
  const { error } = await svc.from("members").delete().eq("id", id);
  if (error) throw new Error(error.message);

  if (target?.auth_user_id) {
    await svc.auth.admin.deleteUser(target.auth_user_id).catch(() => {});
  }

  revalidatePath("/admin/members");
}

/**
 * Super_admin-only: reset an admin user's login password.
 * The member must have an auth_user_id (i.e. a login account).
 */
export async function resetMemberPassword(
  memberId: string,
  newPassword: string,
) {
  const me = await getAuthedAdmin();
  await assertCanMutateMember({ caller: me, targetId: memberId });

  if (!newPassword || newPassword.length < 8) {
    throw new Error("Password must be at least 8 characters long.");
  }

  const svc = createServiceClient();
  const { data: target } = await svc
    .from("members")
    .select("auth_user_id")
    .eq("id", memberId)
    .maybeSingle();

  if (!target?.auth_user_id) {
    throw new Error("This member does not have a login account.");
  }

  const { error } = await svc.auth.admin.updateUserById(target.auth_user_id, {
    password: newPassword,
  });
  if (error) throw new Error(error.message);
}
