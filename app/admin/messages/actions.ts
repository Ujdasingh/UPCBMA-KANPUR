"use server";

import { createClient } from "@/lib/supabase/server";
import type { ContactMessage } from "@/lib/db-types";
import { revalidatePath } from "next/cache";

export async function updateMessageStatus(
  id: string,
  status: ContactMessage["status"],
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("contact_messages")
    .update({ status })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/messages");
}

export async function deleteMessage(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("contact_messages")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/messages");
}
