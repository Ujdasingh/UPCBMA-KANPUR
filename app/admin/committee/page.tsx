import { PageHeader } from "@/components/admin/page-header";
import { createServiceClient } from "@/lib/supabase/server";
import { getAdminContext, isSuperAdmin } from "@/lib/auth";
import { Building2 } from "lucide-react";
import { CommitteeTable } from "./committee-table";

export const dynamic = "force-dynamic";
export const metadata = { title: "Committee — UPCBMA Admin" };

export default async function CommitteePage() {
  const ctx = await getAdminContext();
  const supabase = createServiceClient();

  if (!ctx.activeChapterId) {
    return (
      <>
        <PageHeader
          title="Committee"
          description="Each chapter keeps its own committee."
        />
        <div className="flex gap-3 rounded-sm border border-border bg-surface p-4">
          <Building2
            className="mt-0.5 h-5 w-5 shrink-0 text-muted"
            strokeWidth={1.75}
          />
          <div className="text-sm text-text">
            Pick a chapter from the sidebar to manage that chapter&rsquo;s
            committee roles and appointments.
          </div>
        </div>
      </>
    );
  }

  // Member picker: members of THIS chapter (via chapter_memberships join).
  // Regular admins never see super_admins.
  const { data: chapterMembers } = await supabase
    .from("chapter_memberships")
    .select("member:members(*)")
    .eq("chapter_id", ctx.activeChapterId);
  let members = (chapterMembers ?? [])
    .map((r) => (Array.isArray(r.member) ? r.member[0] : r.member))
    .filter(Boolean) as Array<{ id: string; name: string; role: string; active?: boolean }>;
  if (!isSuperAdmin(ctx.me)) {
    members = members.filter((m) => m.role !== "super_admin");
  }
  members = members
    .filter((m) => m.active !== false)
    .sort((a, b) => a.name.localeCompare(b.name));

  const [apptRes, rolesRes] = await Promise.all([
    supabase
      .from("committee_appointments")
      .select(
        `*,
         member:members ( id, name, email, company, role ),
         role:committee_roles ( key, name, category )`,
      )
      .eq("chapter_id", ctx.activeChapterId)
      .order("display_order", { ascending: true }),
    supabase
      .from("committee_roles")
      .select("*")
      .eq("chapter_id", ctx.activeChapterId)
      .order("sort_order", { ascending: true }),
  ]);

  const filteredAppts = isSuperAdmin(ctx.me)
    ? apptRes.data ?? []
    : (apptRes.data ?? []).filter((a: { member?: { role?: string } | Array<{ role?: string }> }) => {
        const m = Array.isArray(a.member) ? a.member[0] : a.member;
        return m?.role !== "super_admin";
      });

  if (apptRes.error || rolesRes.error) {
    return (
      <>
        <PageHeader title="Committee" />
        <p className="text-sm text-danger">
          Failed to load committee data:{" "}
          {apptRes.error?.message ?? rolesRes.error?.message}
        </p>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={`Committee · ${ctx.activeChapter!.name}`}
        description="Assign roles with fixed tenure. Ending an appointment preserves history. Roles are defined per chapter in the 'Committee roles' page."
      />
      <CommitteeTable
        rows={filteredAppts as never}
        members={members as never}
        roles={rolesRes.data ?? []}
      />
    </>
  );
}
