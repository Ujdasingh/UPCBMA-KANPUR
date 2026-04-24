"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { getAdminContext } from "@/lib/auth";
import type { Booking } from "@/lib/db-types";
import { revalidatePath } from "next/cache";

export async function updateBookingStatus(
  id: string,
  status: Booking["status"],
) {
  await getAdminContext();
  const svc = createServiceClient();
  const { error } = await svc.from("bookings").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/bookings");
}

export async function updateBookingNotes(id: string, formData: FormData) {
  await getAdminContext();
  const svc = createServiceClient();
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const { error } = await svc.from("bookings").update({ notes }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/bookings");
}

export async function deleteBooking(id: string) {
  await getAdminContext();
  const svc = createServiceClient();
  const { error } = await svc.from("bookings").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/bookings");
}
