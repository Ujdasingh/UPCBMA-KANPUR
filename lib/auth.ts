import { createClient, createServiceClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type MemberRole = "member" | "admin" | "super_admin";

export type AuthedMember = {
  id: string;
  name: string;
  email: string;
  role: MemberRole;
  auth_user_id: string;
};

/**
 * Resolve the logged-in auth user to their `members` row.
 * - Redirects to /login if no session.
 * - Redirects to / if the user isn't linked to an admin/super_admin member row.
 *
 * Use this at the top of every admin page + server action so permission logic
 * lives in exactly one place.
 */
export async function getAuthedAdmin(): Promise<AuthedMember> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Use the service client so we can read the member row even if RLS hides
  // super_admin rows from the anon/authed role.
  const svc = createServiceClient();
  const { data: member } = await svc
    .from("members")
    .select("id, name, email, role, auth_user_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (
    !member ||
    (member.role !== "admin" && member.role !== "super_admin")
  ) {
    redirect("/");
  }
  return member as AuthedMember;
}

export function isSuperAdmin(
  m: { role: MemberRole } | null | undefined,
): boolean {
  return m?.role === "super_admin";
}

/**
 * Guard a write operation against sensitive super_admin boundaries.
 * Throws a readable error if:
 *   - The target row is a super_admin and the caller is not.
 *   - The incoming payload tries to promote anyone to super_admin and the
 *     caller is not a super_admin themselves.
 *   - The caller is trying to modify their OWN role (self-lockout safeguard).
 *
 * Call this from every mutating server action that touches `members`.
 */
export async function assertCanMutateMember(opts: {
  caller: AuthedMember;
  targetId?: string | null;
  incomingRole?: string | null;
}) {
  const { caller, targetId, incomingRole } = opts;
  const svc = createServiceClient();

  if (targetId) {
    const { data: target } = await svc
      .from("members")
      .select("id, role, auth_user_id")
      .eq("id", targetId)
      .maybeSingle();

    if (target?.role === "super_admin" && !isSuperAdmin(caller)) {
      throw new Error(
        "Forbidden: you do not have permission to modify this account.",
      );
    }

    // Never let anyone (even a super_admin) change their OWN role; they
    // should not be able to lock themselves out via the UI.
    if (
      target?.auth_user_id === caller.auth_user_id &&
      incomingRole &&
      incomingRole !== caller.role
    ) {
      throw new Error(
        "You cannot change your own role. Ask another super_admin to do it.",
      );
    }
  }

  if (incomingRole === "super_admin" && !isSuperAdmin(caller)) {
    throw new Error(
      "Forbidden: only a super_admin can assign the super_admin role.",
    );
  }
}
