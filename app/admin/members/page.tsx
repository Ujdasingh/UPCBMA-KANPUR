import { PageHeader } from "@/components/admin/page-header";
import { createServiceClient } from "@/lib/supabase/server";
import { getAuthedAdmin, isSuperAdmin } from "@/lib/auth";
import { MembersTable } from "./members-table";

export const dynamic = "force-dynamic";
export const metadata = { title: "Members — UPCBMA Admin" };

export default async function MembersPage() {
  const me = await getAuthedAdmin();
  const svc = createServiceClient();

  // Regular admins must never see super_admin rows. Super_admins see everyone.
  let query = svc.from("members").select("*").order("name", { ascending: true });
  if (!isSuperAdmin(me)) {
    query = query.neq("role", "super_admin");
  }
  const { data, error } = await query;

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
      <MembersTable
        rows={data ?? []}
        canManageSuperAdmin={isSuperAdmin(me)}
        currentAuthUserId={me.auth_user_id}
      />
    </>
  );
}
