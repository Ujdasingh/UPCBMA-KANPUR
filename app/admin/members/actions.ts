"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { assertCanMutateMember, getAuthedAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

// -------- Error handling helpers --------

/** Check whether an error is Next's redirect signal — those must propagate. */
function isRedirect(e: unknown): boolean {
  const d = (e as { digest?: string } | undefined)?.digest;
  return typeof d === "string" && d.startsWith("NEXT_REDIRECT");
}

function redirectWithError(msg: string): never {
  redirect("/admin/members?error=" + encodeURIComponent(msg));
}

function redirectOK(msg?: string): never {
  const q = new URLSearchParams();
  if (msg) q.set("ok", msg);
  redirect("/admin/members" + (q.toString() ? "?" + q.toString() : ""));
}

/** Map low-level DB / auth errors to something an admin can act on. */
function friendlyError(raw: string): string {
  if (/members_pkey/i.test(raw)) return "That Member ID is already taken — pick a different one.";
  if (/members_email_key/i.test(raw))
    return "That contact email is already used by another member. Use a different email or update the existing member.";
  if (/members_auth_user_id/i.test(raw))
    return "That user is already linked to another member row.";
  if (/User already registered|already been registered|email_exists/i.test(raw))
    return "That login email is already registered in auth. Pick a different login email.";
  if (/password/i.test(raw) && /short|weak|length/i.test(raw))
    return "Password is too weak. Use at least 8 characters.";
  return raw;
}

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

// -------- Public actions --------

export async function createMember(formData: FormData) {
  try {
    const me = await getAuthedAdmin();
    const id = String(formData.get("id") ?? "").trim();
    if (!id) redirectWithError("Member ID is required.");

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
      if (!loginEmail)
        redirectWithError("Login email is required when creating a login account.");
      if (!initialPassword || initialPassword.length < 8)
        redirectWithError("Initial password must be at least 8 characters long.");

      const { data: authData, error: authError } =
        await svc.auth.admin.createUser({
          email: loginEmail,
          password: initialPassword,
          email_confirm: true,
        });
      if (authError || !authData?.user) {
        redirectWithError(
          friendlyError(authError?.message ?? "Could not create login account."),
        );
      }
      authUserId = authData.user.id;
    } else {
      payload.role = "member";
    }

    const { error } = await svc
      .from("members")
      .insert({ id, ...payload, auth_user_id: authUserId });

    if (error) {
      // Roll back the orphaned auth user so retrying works cleanly.
      if (authUserId) {
        await svc.auth.admin.deleteUser(authUserId).catch(() => {});
      }
      redirectWithError(friendlyError(error.message));
    }

    revalidatePath("/admin/members");
    redirectOK("Member added.");
  } catch (e) {
    if (isRedirect(e)) throw e;
    redirectWithError(
      friendlyError(e instanceof Error ? e.message : String(e)),
    );
  }
}

export async function updateMember(id: string, formData: FormData) {
  try {
    const me = await getAuthedAdmin();
    const payload = parseMemberForm(formData);

    await assertCanMutateMember({
      caller: me,
      targetId: id,
      incomingRole: payload.role,
    });

    const svc = createServiceClient();
    const { error } = await svc.from("members").update(payload).eq("id", id);
    if (error) redirectWithError(friendlyError(error.message));

    revalidatePath("/admin/members");
    redirectOK("Member updated.");
  } catch (e) {
    if (isRedirect(e)) throw e;
    redirectWithError(
      friendlyError(e instanceof Error ? e.message : String(e)),
    );
  }
}

export async function toggleMemberActive(id: string, active: boolean) {
  try {
    const me = await getAuthedAdmin();
    await assertCanMutateMember({ caller: me, targetId: id });

    const svc = createServiceClient();
    const { error } = await svc
      .from("members")
      .update({ active })
      .eq("id", id);
    if (error) redirectWithError(friendlyError(error.message));

    revalidatePath("/admin/members");
  } catch (e) {
    if (isRedirect(e)) throw e;
    redirectWithError(
      friendlyError(e instanceof Error ? e.message : String(e)),
    );
  }
}

export async function deleteMember(id: string) {
  try {
    const me = await getAuthedAdmin();
    await assertCanMutateMember({ caller: me, targetId: id });

    const svc = createServiceClient();
    const { data: target } = await svc
      .from("members")
      .select("auth_user_id")
      .eq("id", id)
      .maybeSingle();

    if (target?.auth_user_id === me.auth_user_id) {
      redirectWithError("You cannot delete your own account.");
    }

    const { error } = await svc.from("members").delete().eq("id", id);
    if (error) redirectWithError(friendlyError(error.message));

    if (target?.auth_user_id) {
      await svc.auth.admin.deleteUser(target.auth_user_id).catch(() => {});
    }

    revalidatePath("/admin/members");
    redirectOK("Member deleted.");
  } catch (e) {
    if (isRedirect(e)) throw e;
    redirectWithError(
      friendlyError(e instanceof Error ? e.message : String(e)),
    );
  }
}

export async function resetMemberPassword(
  memberId: string,
  newPassword: string,
) {
  // This one is called from a client handler (not a form action), so we
  // still throw on error — the caller has its own try/catch and UI error
  // display.
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
  if (error) throw new Error(friendlyError(error.message));
}
