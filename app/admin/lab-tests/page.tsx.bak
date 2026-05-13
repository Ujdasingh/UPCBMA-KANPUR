import { PageHeader } from "@/components/admin/page-header";
import { createServiceClient } from "@/lib/supabase/server";
import { getAdminContext } from "@/lib/auth";
import { Building2 } from "lucide-react";
import { LabTestsTable } from "./lab-tests-table";

export const dynamic = "force-dynamic";
export const metadata = { title: "Lab tests — UPCBMA Admin" };

export default async function LabTestsPage() {
  const ctx = await getAdminContext();
  const svc = createServiceClient();

  let query = svc
    .from("lab_tests_catalog")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("code", { ascending: true });

  if (ctx.activeChapterId) {
    query = query.eq("chapter_id", ctx.activeChapterId);
  }

  const { data, error } = await query;

  if (error) {
    return (
      <>
        <PageHeader title="Lab tests" />
        <p className="text-sm text-danger">
          Failed to load tests: {error.message}
        </p>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={
          ctx.activeChapter
            ? `Lab tests · ${ctx.activeChapter.name}`
            : "Lab tests · All chapters"
        }
        description={
          ctx.activeChapter
            ? `Catalogue shown on ${ctx.activeChapter.name}'s public lab page.`
            : "Every chapter's lab catalogue. Switch to a specific chapter to add or edit tests for it."
        }
      />
      {!ctx.activeChapter && (
        <div className="mb-5 flex gap-3 rounded-sm border border-border bg-surface p-4">
          <Building2
            className="mt-0.5 h-5 w-5 shrink-0 text-muted"
            strokeWidth={1.75}
          />
          <div className="text-sm text-text">
            You&rsquo;re viewing every chapter&rsquo;s catalogue. Pick a
            chapter in the sidebar before adding or editing a test.
          </div>
        </div>
      )}
      <LabTestsTable
        rows={data ?? []}
        activeChapterId={ctx.activeChapterId}
      />
    </>
  );
}
