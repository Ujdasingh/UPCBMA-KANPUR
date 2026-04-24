import { PageHeader } from "@/components/admin/page-header";
import { createClient } from "@/lib/supabase/server";
import { CommitteeTable } from "./committee-table";

export const dynamic = "force-dynamic";
export const metadata = { title: "Committee — UPCBMA Admin" };

export default async function CommitteePage() {
  const supabase = await createClient();

  // Fetch appointments with joined role + member info. PostgREST lets us
  // express this as `select="...,member:members(...),role:committee_roles(...)"`.
  const [apptRes, membersRes, rolesRes] = await Promise.all([
    supabase
      .from("committee_appointments")
      .select(
        `*,
         member:members ( id, name, email, company ),
         role:committee_roles ( key, name, category )`,
      )
      .order("display_order", { ascending: true }),
    supabase
      .from("members")
      .select("*")
      .eq("active", true)
      .order("name", { ascending: true }),
    supabase
      .from("committee_roles")
      .select("*")
      .order("sort_order", { ascending: true }),
  ]);

  if (apptRes.error || membersRes.error || rolesRes.error) {
    return (
      <>
        <PageHeader title="Committee" />
        <p className="text-sm text-danger">
          Failed to load committee data:{" "}
          {apptRes.error?.message ??
            membersRes.error?.message ??
            rolesRes.error?.message}
        </p>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Committee"
        description="Assign roles with fixed tenure. Ending an appointment preserves history."
      />
      <CommitteeTable
        rows={(apptRes.data ?? []) as never}
        members={membersRes.data ?? []}
        roles={rolesRes.data ?? []}
      />
    </>
  );
}
