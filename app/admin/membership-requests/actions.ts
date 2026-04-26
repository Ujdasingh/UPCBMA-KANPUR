"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { getAdminContext } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function setRequestStatus(id: string, status: string) {
  const ctx = await getAdminContext();
  const svc = createServiceClient();
  await svc
    .from("membership_requests")
    .update({
      status,
      reviewed_by: ctx.me.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);
  revalidatePath("/admin/membership-requests");
}

export async function deleteRequest(id: string) {
  await getAdminContext();
  const svc = createServiceClient();
  await svc.from("membership_requests").delete().eq("id", id);
  revalidatePath("/admin/membership-requests");
}
