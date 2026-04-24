"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Shape formData to the members table's Insert/Update payload.
// Each action uses FormData so it can be bound directly to <form action>.
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
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Member ID is required");

  const payload = parseMemberForm(formData);
  const { error } = await supabase.from("members").insert({ id, ...payload });
  if (error) throw new Error(error.message);

  revalidatePath("/admin/members");
}

export async function updateMember(id: string, formData: FormData) {
  const supabase = await createClient();
  const payload = parseMemberForm(formData);

  const { error } = await supabase
    .from("members")
    .update(payload)
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/members");
}

export async function toggleMemberActive(id: string, active: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("members")
    .update({ active })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/members");
}

export async function deleteMember(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("members").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/members");
}
