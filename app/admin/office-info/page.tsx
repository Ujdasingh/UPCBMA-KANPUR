import { PageHeader } from "@/components/admin/page-header";
import { createServiceClient } from "@/lib/supabase/server";
import { getAdminContext } from "@/lib/auth";
import { Building2 } from "lucide-react";
import { OfficeInfoForm } from "./office-info-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Office info — UPCBMA Admin" };

export default async function OfficeInfoPage() {
  const ctx = await getAdminContext();
  const svc = createServiceClient();

  if (!ctx.activeChapterId) {
    return (
      <>
        <PageHeader
          title="Office info"
          description="Each chapter keeps its own office details."
        />
        <div className="flex gap-3 rounded-sm border border-border bg-surface p-4">
          <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-muted" strokeWidth={1.75} />
          <div className="text-sm text-text">
            Pick a chapter from the sidebar to view or edit its office info.
          </div>
        </div>
      </>
    );
  }

  // One office_info row per chapter. maybeSingle tolerates first-time setup.
  const { data, error } = await svc
    .from("office_info")
    .select("*")
    .eq("chapter_id", ctx.activeChapterId)
    .maybeSingle();

  if (error) {
    return (
      <>
        <PageHeader title="Office info" />
        <p className="text-sm text-danger">
          Failed to load office info: {error.message}
        </p>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={`Office info · ${ctx.activeChapter!.name}`}
        description="Shown on the public Lab and Contact pages for this chapter."
      />
      <OfficeInfoForm info={data ?? null} />
    </>
  );
}
