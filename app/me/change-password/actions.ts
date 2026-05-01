"use server";

/**
 * Self-serve password change. Reachable by any signed-in member; the
 * middleware force-redirects new invitees here until they pick their own
 * password (members.must_change_password=true).
 */

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function changeMyPassword(formData: FormData) {
  const newPassword = String(formData.get("new_password") ?? "");
  const confirm = String(formData.get("confirm_password") ?? "");

  if (newPassword.length < 8) {
    return fail("Use a password of at least 8 characters.");
  }
  if (newPassword !== confirm) {
    return fail("Passwords don't match — try again.");
  }
  if (/^[a-z]+$|^[0-9]+$/i.test(newPassword)) {
    return fail("Mix letters and numbers — too easy to guess otherwise.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/me/change-password");

  // Update via the user's own session — that way we don't need the service
  // role for self-serve changes.
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return fail(error.message);

  // Clear the must_change_password flag (service role bypasses RLS).
  const svc = createServiceClient();
  await svc
    .from("members")
    .update({ must_change_password: false })
    .eq("auth_user_id", user.id);

  revalidatePath("/me");
  redirect("/me?ok=" + encodeURIComponent("Password updated. You're all set."));
}

function fail(msg: string): never {
  redirect(`/me/change-password?error=${encodeURIComponent(msg)}`);
}
