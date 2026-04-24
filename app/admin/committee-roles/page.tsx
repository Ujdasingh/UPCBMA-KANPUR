import { PageHeader } from "@/components/admin/page-header";
import { createServiceClient } from "@/lib/supabase/server";
import { getAdminContext } from "@/lib/auth";
import { AlertTriangle, Building2, CheckCircle2 } from "lucide-react";
import { RolesTable } from "./roles-table";

export const dynamic = "force-dynamic";
export const metadata = { title: "Committee roles — UPCBMA Admin" };

export default async function CommitteeRolesPage({
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
          title="Committee roles"
          description="Each chapter defines its own role list (President, VP1, Secretary, and so on)."
        />
        <div className="flex gap-3 rounded-sm border border-border bg-surface p-4">
          <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-muted" strokeWidth={1.75} />
          <div className="text-sm text-text">
            Pick a chapter from the sidebar to define its committee roles.
          </div>
        </div>
      </>
    );
  }

  const svc = createServiceClient();
  const { data: roles } = await svc
    .from("committee_roles")
    .select("key, name, category, description, sort_order, active, chapter_id")
    .eq("chapter_id", ctx.activeChapterId)
    .order("sort_order", { ascending: true });

  return (
    <>
      <PageHeader
        title={`Committee roles · ${ctx.activeChapter.name}`}
        description={`Which roles exist on ${ctx.activeChapter.name}'s committee (President, VP, Secretary, Treasurer, etc.). Edit once per year to match the chapter's structure.`}
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

      <RolesTable rows={(roles ?? []) as never} />
    </>
  );
}
