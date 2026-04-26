"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function signIn(formData: FormData) {
  const supabase = await createClient();

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const requestedNext = String(formData.get("next") ?? "").trim();

  const { error, data } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    const msg = encodeURIComponent(error.message);
    const back = requestedNext ? "&next=" + encodeURIComponent(requestedNext) : "";
    redirect(`/login?error=${msg}${back}`);
  }

  // Resolve the role to decide where to land:
  //   - admin / super_admin  → /admin (or whatever they came from, if it was admin)
  //   - member               → /me
  //   - no member row        → /  (treat as a regular signed-in visitor)
  const svc = createServiceClient();
  const { data: member } = await svc
    .from("members")
    .select("role")
    .eq("auth_user_id", data.user?.id ?? "")
    .maybeSingle();

  const role = member?.role;

  // If the caller specified ?next=, honour it as long as it's safe (starts with /).
  const next =
    requestedNext.startsWith("/")
      ? requestedNext
      : role === "admin" || role === "super_admin"
        ? "/admin"
        : role === "member"
          ? "/me"
          : "/";

  redirect(next);
}
