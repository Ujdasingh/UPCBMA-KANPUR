import { PageHeader } from "@/components/admin/page-header";
import { createClient } from "@/lib/supabase/server";
import { MembersTable } from "./members-table";

export const dynamic = "force-dynamic";
export const metadata = { title: "Members — UPCBMA Admin" };

export default async function MembersPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("members")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    return (
      <>
        <PageHeader title="Members" />
        <p className="text-sm text-danger">
          Failed to load members: {error.message}
        </p>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Members"
        description="The association roster. Add, edit, or retire members here."
      />
      <MembersTable rows={data ?? []} />
    </>
  );
}
