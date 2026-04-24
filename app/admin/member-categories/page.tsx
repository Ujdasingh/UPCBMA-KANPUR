import { PageHeader } from "@/components/admin/page-header";
import { createServiceClient } from "@/lib/supabase/server";
import { getAdminContext } from "@/lib/auth";
import { AlertTriangle, Building2, CheckCircle2 } from "lucide-react";
import { CategoriesTable } from "./categories-table";

export const dynamic = "force-dynamic";
export const metadata = { title: "Member categories — UPCBMA Admin" };

export default async function MemberCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { error, ok } = await searchParams;
  const ctx = await getAdminContext();

  if (!ctx.activeChapterId || !ctx.activeChapter) {
    return (
      <>
        <PageHeader
          title="Member categories"
          description="Each chapter defines its own membership tiers (Executive, Member, Life, Patron, etc.)."
        />
        <div className="flex gap-3 rounded-sm border border-border bg-surface p-4">
          <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-muted" strokeWidth={1.75} />
          <div className="text-sm text-text">
            Pick a chapter from the sidebar to manage its member categories.
          </div>
        </div>
      </>
    );
  }

  const svc = createServiceClient();

  const [{ data: categories }, { data: memberships }] = await Promise.all([
    svc
      .from("member_categories")
      .select("id, name, slug, description, sort_order, chapter_id")
      .eq("chapter_id", ctx.activeChapterId)
      .order("sort_order", { ascending: true }),
    svc
      .from("chapter_memberships")
      .select("category_id")
      .eq("chapter_id", ctx.activeChapterId),
  ]);

  // Build member count per category.
  const counts = new Map<string, number>();
  (memberships ?? []).forEach((m) => {
    if (!m.category_id) return;
    counts.set(m.category_id, (counts.get(m.category_id) ?? 0) + 1);
  });

  const rows = (categories ?? []).map((c) => ({
    ...c,
    member_count: counts.get(c.id) ?? 0,
  }));

  return (
    <>
      <PageHeader
        title={`Member categories · ${ctx.activeChapter.name}`}
        description={`Define the membership tiers on ${ctx.activeChapter.name}. Members pick one when joining the chapter.`}
      />

      {error && (
        <div className="mb-5 flex gap-3 rounded-sm border border-red-200 bg-red-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" strokeWidth={1.75} />
          <div className="text-sm text-red-900">{error}</div>
        </div>
      )}
      {ok && (
        <div className="mb-5 flex gap-3 rounded-sm border border-emerald-200 bg-emerald-50 p-4">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" strokeWidth={1.75} />
          <div className="text-sm text-emerald-900">{ok}</div>
        </div>
      )}

      <CategoriesTable rows={rows} />
    </>
  );
}
