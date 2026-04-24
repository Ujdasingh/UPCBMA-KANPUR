import { PageHeader } from "@/components/admin/page-header";
import { createClient } from "@/lib/supabase/server";
import { LabTestsTable } from "./lab-tests-table";

export const dynamic = "force-dynamic";
export const metadata = { title: "Lab tests — UPCBMA Admin" };

export default async function LabTestsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lab_tests_catalog")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("code", { ascending: true });

  if (error) {
    return (
      <>
        <PageHeader title="Lab tests" />
        <p className="text-sm text-danger">
          Failed to load tests: {error.message}
        </p>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Lab tests"
        description="Edit the catalogue that appears on the public Lab page."
      />
      <LabTestsTable rows={data ?? []} />
    </>
  );
}
