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

  // Look up the member row so we can decide where to land AND whether they
  // need to set a real password before going anywhere else.
  const svc = createServiceClient();
  const { data: member } = await svc
    .from("members")
    .select("role, must_change_password")
    .eq("auth_user_id", data.user?.id ?? "")
    .maybeSingle();

  const role = member?.role;

  // First-time invitees go straight to the change-password screen — but only
  // ONCE, at login. A banner on /me reminds them after that. We deliberately
  // don't gate every page navigation on this flag (it makes the site feel
  // broken and prevents form submissions).
  if (member?.must_change_password === true) {
    redirect("/me/change-password?first=1");
  }

  // If the caller specified ?next=, honour it as long as it's safe (starts with /).
  const next = requestedNext.startsWith("/")
    ? requestedNext
    : role === "admin" || role === "super_admin"
      ? "/admin"
      : role === "member"
        ? "/me"
        : "/";

  redirect(next);
}
