import { PageHeader } from "@/components/admin/page-header";
import { createServiceClient } from "@/lib/supabase/server";
import { getAuthedAdmin, isSuperAdmin } from "@/lib/auth";
import { CommitteeTable } from "./committee-table";

export const dynamic = "force-dynamic";
export const metadata = { title: "Committee — UPCBMA Admin" };

export default async function CommitteePage() {
  const me = await getAuthedAdmin();
  const supabase = createServiceClient();

  // Build the member picker: regular admins never see super_admins in the
  // list of people who can be appointed.
  let membersQuery = supabase
    .from("members")
    .select("*")
    .eq("active", true)
    .order("name", { ascending: true });
  if (!isSuperAdmin(me)) {
    membersQuery = membersQuery.neq("role", "super_admin");
  }

  // Fetch appointments with joined role + member info. PostgREST lets us
  // express this as `select="...,member:members(...),role:committee_roles(...)"`.
  const [apptRes, membersRes, rolesRes] = await Promise.all([
    supabase
      .from("committee_appointments")
      .select(
        `*,
         member:members ( id, name, email, company, role ),
         role:committee_roles ( key, name, category )`,
      )
      .order("display_order", { ascending: true }),
    membersQuery,
    supabase
      .from("committee_roles")
      .select("*")
      .order("sort_order", { ascending: true }),
  ]);

  // Also hide any appointments whose member is a super_admin from non-super callers.
  const filteredAppts = isSuperAdmin(me)
    ? apptRes.data ?? []
    : (apptRes.data ?? []).filter((a: { member?: { role?: string } | Array<{ role?: string }> }) => {
        const m = Array.isArray(a.member) ? a.member[0] : a.member;
        return m?.role !== "super_admin";
      });

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
        rows={filteredAppts as never}
        members={membersRes.data ?? []}
        roles={rolesRes.data ?? []}
      />
    </>
  );
}
