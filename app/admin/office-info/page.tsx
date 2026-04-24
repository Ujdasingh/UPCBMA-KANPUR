import { PageHeader } from "@/components/admin/page-header";
import { createClient } from "@/lib/supabase/server";
import { OfficeInfoForm } from "./office-info-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Office info — UPCBMA Admin" };

export default async function OfficeInfoPage() {
  const supabase = await createClient();
  // Singleton row — always id=1. `maybeSingle` tolerates it not existing yet.
  const { data, error } = await supabase
    .from("office_info")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    return (
      <>
        <PageHeader title="Office info" />
        <p className="text-sm text-danger">
          Failed to load office info: {error.message}
        </p>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Office info"
        description="Used on the public Lab and Contact pages. There is only one record."
      />
      <OfficeInfoForm info={data ?? null} />
    </>
  );
}
