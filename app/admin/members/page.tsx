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
  let query = svc
    .from("members")
    .select("*")
    .order("name", { ascending: true });
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

  // Pull login emails from auth.users for any member that has an auth_user_id.
  // We do this via the admin API (service-role only) and merge in memory.
  const { data: authList } = await svc.auth.admin.listUsers({ perPage: 1000 });
  const authEmailById = new Map<string, string>();
  authList?.users?.forEach((u) => {
    if (u.id && u.email) authEmailById.set(u.id, u.email);
  });

  const rows = (data ?? []).map((m) => ({
    ...m,
    login_email: m.auth_user_id ? authEmailById.get(m.auth_user_id) ?? null : null,
  }));

  return (
    <>
      <PageHeader
        title="Members"
        description="The association roster. Add, edit, or retire members here. Admins with a login account are shown with their login identifier."
      />
      <MembersTable
        rows={rows}
        canManageSuperAdmin={isSuperAdmin(me)}
        currentAuthUserId={me.auth_user_id}
      />
    </>
  );
}
