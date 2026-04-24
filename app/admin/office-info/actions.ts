"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// office_info is a singleton row (id = 1). We upsert rather than insert/update
// so the page works even before the row exists.
export async function saveOfficeInfo(formData: FormData) {
  const supabase = await createClient();

  const payload = {
    id: 1,
    phone: String(formData.get("phone") ?? "").trim() || null,
    lab_phone: String(formData.get("lab_phone") ?? "").trim() || null,
    email: String(formData.get("email") ?? "").trim() || null,
    address: String(formData.get("address") ?? "").trim() || null,
    hours: String(formData.get("hours") ?? "").trim() || null,
    lab_contact_name:
      String(formData.get("lab_contact_name") ?? "").trim() || null,
    lab_contact_role:
      String(formData.get("lab_contact_role") ?? "").trim() || null,
    lab_billing_model:
      String(formData.get("lab_billing_model") ?? "").trim() || null,
  };

  const { error } = await supabase.from("office_info").upsert(payload);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/office-info");
  revalidatePath("/lab");
  revalidatePath("/contact");
}
