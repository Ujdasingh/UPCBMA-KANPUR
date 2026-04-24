import { PageHeader } from "@/components/admin/page-header";
import { createServiceClient } from "@/lib/supabase/server";
import { getAuthedAdmin, isSuperAdmin } from "@/lib/auth";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { MembersTable } from "./members-table";

export const dynamic = "force-dynamic";
export const metadata = { title: "Members — UPCBMA Admin" };

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { error, ok } = await searchParams;

  const me = await getAuthedAdmin();
  const svc = createServiceClient();

  // Regular admins must never see super_admin rows.
  let query = svc
    .from("members")
    .select("*")
    .order("name", { ascending: true });
  if (!isSuperAdmin(me)) {
    query = query.neq("role", "super_admin");
  }
  const { data, error: loadErr } = await query;

  if (loadErr) {
    return (
      <>
        <PageHeader title="Members" />
        <p className="text-sm text-danger">
          Failed to load members: {loadErr.message}
        </p>
      </>
    );
  }

  // Pull login emails from auth.users for members that have an auth_user_id.
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

      {error && (
        <div className="mb-5 flex gap-3 rounded-sm border border-red-200 bg-red-50 p-4">
          <AlertTriangle
            className="mt-0.5 h-5 w-5 shrink-0 text-red-700"
            strokeWidth={1.75}
          />
          <div className="text-sm text-red-900">
            <div className="font-semibold">Couldn&rsquo;t save.</div>
            <div className="mt-0.5">{error}</div>
          </div>
        </div>
      )}
      {ok && (
        <div className="mb-5 flex gap-3 rounded-sm border border-emerald-200 bg-emerald-50 p-4">
          <CheckCircle2
            className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700"
            strokeWidth={1.75}
          />
          <div className="text-sm text-emerald-900">{ok}</div>
        </div>
      )}

      <MembersTable
        rows={rows}
        canManageSuperAdmin={isSuperAdmin(me)}
        currentAuthUserId={me.auth_user_id}
      />
    </>
  );
}
