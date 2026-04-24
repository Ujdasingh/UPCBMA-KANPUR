"use server";

import { createClient } from "@/lib/supabase/server";
import type { Booking } from "@/lib/db-types";
import { revalidatePath } from "next/cache";

export async function updateBookingStatus(
  id: string,
  status: Booking["status"],
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("bookings")
    .update({ status })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/bookings");
}

export async function updateBookingNotes(id: string, formData: FormData) {
  const supabase = await createClient();
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const { error } = await supabase
    .from("bookings")
    .update({ notes })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/bookings");
}

export async function deleteBooking(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("bookings").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/bookings");
}
