"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function signIn(formData: FormData) {
  const supabase = await createClient();

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/admin");

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    const msg = encodeURIComponent(error.message);
    redirect(`/login?error=${msg}&next=${encodeURIComponent(next)}`);
  }

  redirect(next);
}
