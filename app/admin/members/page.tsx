import { PageHeader } from "@/components/admin/page-header";
import { createServiceClient } from "@/lib/supabase/server";
import { getAdminContext } from "@/lib/auth";
import { AlertTriangle, CheckCircle2, Building2 } from "lucide-react";
import { MembersTable } from "./members-table";
import type { Member } from "@/lib/db-types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Members — UPCBMA Admin" };

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { error, ok } = await searchParams;
  const ctx = await getAdminContext();
  const svc = createServiceClient();

  // -------- Load members scoped by active chapter --------
  let members: Member[] = [];

  if (ctx.activeChapterId) {
    // Chapter-scoped view: pull via chapter_memberships join
    const { data } = await svc
      .from("chapter_memberships")
      .select("member:members(*)")
      .eq("chapter_id", ctx.activeChapterId);

    members = ((data ?? [])
      .map((r) => (Array.isArray(r.member) ? r.member[0] : r.member))
      .filter(Boolean) as Member[])
      .sort((a, b) => a.name.localeCompare(b.name));
  } else {
    // All-chapters view: everyone globally
    const { data } = await svc
      .from("members")
      .select("*")
      .order("name", { ascending: true });
    members = (data ?? []) as Member[];
  }

  // Hide super_admins from non-super admins
  if (!ctx.isSuper) {
    members = members.filter((m) => m.role !== "super_admin");
  }

  // Join login emails from auth.users
  const { data: authList } = await svc.auth.admin.listUsers({ perPage: 1000 });
  const authEmailById = new Map<string, string>();
  authList?.users?.forEach((u) => {
    if (u.id && u.email) authEmailById.set(u.id, u.email);
  });

  const rows = members.map((m) => ({
    ...m,
    login_email: m.auth_user_id ? authEmailById.get(m.auth_user_id) ?? null : null,
  }));

  // -------- Load categories for EVERY chapter the admin can manage -----------
  // The create form can target any of those chapters, so we preload all of
  // them grouped by chapter_id and let the client switch without a refetch.
  const chapterIds = ctx.availableChapters.map((c) => c.id);
  const { data: allCats } = await svc
    .from("member_categories")
    .select("id, name, slug, chapter_id, sort_order")
    .in("chapter_id", chapterIds.length ? chapterIds : ["00000000-0000-0000-0000-000000000000"])
    .order("sort_order", { ascending: true });

  const categoriesByChapter: Record<
    string,
    { id: string; name: string; slug: string }[]
  > = {};
  (allCats ?? []).forEach((c) => {
    if (!categoriesByChapter[c.chapter_id]) categoriesByChapter[c.chapter_id] = [];
    categoriesByChapter[c.chapter_id]!.push({ id: c.id, name: c.name, slug: c.slug });
  });

  return (
    <>
      <PageHeader
        title={
          ctx.activeChapter
            ? `Members · ${ctx.activeChapter.name}`
            : "Members · All chapters"
        }
        description={
          ctx.activeChapter
            ? `Roster for ${ctx.activeChapter.name}. Switch chapter from the sidebar to view another.`
            : "Every member across every chapter. Switch to a specific chapter from the sidebar to add or scope changes to that chapter."
        }
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

      {/* Info banner when viewing All chapters */}
      {!ctx.activeChapter && (
        <div className="mb-5 flex gap-3 rounded-sm border border-border bg-surface p-4">
          <Building2
            className="mt-0.5 h-5 w-5 shrink-0 text-muted"
            strokeWidth={1.75}
          />
          <div className="text-sm text-text">
            You&rsquo;re viewing all members across every chapter. You can
            still add a new member — pick their chapter from the form.
          </div>
        </div>
      )}

      <MembersTable
        rows={rows}
        canManageSuperAdmin={ctx.isSuper}
        currentAuthUserId={ctx.me.auth_user_id}
        activeChapter={ctx.activeChapter}
        availableChapters={ctx.availableChapters}
        categoriesByChapter={categoriesByChapter}
      />
    </>
  );
}
