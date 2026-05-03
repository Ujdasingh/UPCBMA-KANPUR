import { redirect } from "next/navigation";
import { PageHeader } from "@/components/admin/page-header";
import { createServiceClient } from "@/lib/supabase/server";
import { getAuthedAdmin } from "@/lib/auth";
import { listPermissions } from "@/lib/permissions";
import { PermissionsForm, type MemberLite } from "./permissions-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Permissions · Admin" };

/**
 * /admin/permissions — admin/super_admin assigns granular permission keys
 * to specific members. Backstop for cases where the role-based defaults
 * don't fit (e.g., "labkanpur" needs lab.edit + bookings.manage but
 * shouldn't be a full admin).
 *
 * The matrix UI lives in permissions-form.tsx; this page just feeds it
 * the catalogue + members-with-grants snapshot.
 */
export default async function PermissionsPage() {
  const me = await getAuthedAdmin();
  if (!me) redirect("/login?next=/admin/permissions");
  if (me.role !== "admin" && me.role !== "super_admin") redirect("/admin");

  const svc = createServiceClient();
  const today = new Date().toISOString().slice(0, 10);

  const [
    permissions,
    { data: memberRows },
    { data: grantRows },
    { data: appointmentRows },
  ] = await Promise.all([
    listPermissions(),
    svc
      .from("members")
      .select("id, name, company, role")
      .eq("active", true)
      .order("role", { ascending: false })
      .order("name", { ascending: true }),
    svc.from("member_permissions").select("member_id, permission_key"),
    svc
      .from("committee_appointments")
      .select("member_id")
      .eq("status", "active")
      .lte("term_start", today)
      .gte("term_end", today),
  ]);

  // Hide super_admin rows from non-super admins so they can't even see
  // them in the picker. Skip the caller themselves too — flipping your
  // own grants while you're in the process of doing so is a foot-gun.
  const visibleMembers = (memberRows ?? []).filter((m) => {
    if (m.role === "super_admin" && me.role !== "super_admin") return false;
    if (m.id === me.id) return false;
    return true;
  });

  const grantsByMember = new Map<string, string[]>();
  for (const g of grantRows ?? []) {
    const list = grantsByMember.get(g.member_id) ?? [];
    list.push(g.permission_key);
    grantsByMember.set(g.member_id, list);
  }

  const activeCommitteeIds = new Set(
    (appointmentRows ?? []).map((a) => a.member_id),
  );

  const members: MemberLite[] = visibleMembers.map((m) => ({
    id: m.id,
    name: m.name,
    company: m.company ?? null,
    role: m.role,
    grants: grantsByMember.get(m.id) ?? [],
    hasActiveCommittee: activeCommitteeIds.has(m.id),
  }));

  return (
    <>
      <PageHeader
        title="Permissions"
        description="Grant granular access by checking the boxes a member should have. The 'Editor', 'Lab desk', and 'Office' presets at the top flip a sensible default set in one click. Active committee members already get the content tier automatically — no checkboxes needed."
      />
      <PermissionsForm
        members={members}
        permissions={permissions}
        callerIsSuper={me.role === "super_admin"}
      />
    </>
  );
}
