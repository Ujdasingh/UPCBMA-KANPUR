import { PageHeader } from "@/components/admin/page-header";
import { createServiceClient } from "@/lib/supabase/server";
import { getAdminContext } from "@/lib/auth";
import { Building2 } from "lucide-react";
import {
  PastCommitteesTable,
  type PastTermRow,
} from "./past-committees-table";

export const dynamic = "force-dynamic";
export const metadata = { title: "Past committees · Admin" };

export default async function PastCommitteesAdmin() {
  const ctx = await getAdminContext();
  const svc = createServiceClient();

  let query = svc
    .from("past_committee_terms")
    .select(
      "id, fy_label, starts_on, ends_on, president_name, president_member_id, president_photo_url, achievements, display_order",
    )
    .order("ends_on", { ascending: false })
    .order("display_order", { ascending: true });

  if (ctx.activeChapterId) {
    query = query.eq("chapter_id", ctx.activeChapterId);
  }

  const { data, error } = await query;

  if (error) {
    return (
      <>
        <PageHeader title="Past committees" />
        <p className="text-sm text-danger">
          Failed to load: {error.message}
        </p>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={
          ctx.activeChapter
            ? `Past committees · ${ctx.activeChapter.name}`
            : "Past committees · All chapters"
        }
        description={
          ctx.activeChapter
            ? `Historical record published at /${ctx.activeChapter.slug}/past-committees.`
            : "Past terms across every chapter. Switch to a chapter in the sidebar to add or edit one."
        }
      />
      {!ctx.activeChapter && (
        <div className="mb-5 flex gap-3 rounded-sm border border-border bg-surface p-4">
          <Building2
            className="mt-0.5 h-5 w-5 shrink-0 text-muted"
            strokeWidth={1.75}
          />
          <div className="text-sm text-text">
            Pick a chapter in the sidebar before adding a past term — entries
            are scoped to the chapter that hosted that committee.
          </div>
        </div>
      )}
      <PastCommitteesTable rows={(data ?? []) as PastTermRow[]} />
    </>
  );
}
