import { PageHeader } from "@/components/admin/page-header";
import { createServiceClient } from "@/lib/supabase/server";
import { getAuthedAdmin, isSuperAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { ChaptersTable } from "./chapters-table";
import type { Chapter } from "@/lib/chapters";

export const dynamic = "force-dynamic";
export const metadata = { title: "Chapters — UPCBMA Admin" };

export default async function ChaptersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const me = await getAuthedAdmin();
  if (!isSuperAdmin(me)) redirect("/admin");

  const { error, ok } = await searchParams;
  const svc = createServiceClient();

  const { data: chapters } = await svc
    .from("chapters")
    .select(
      "id, slug, name, city, state, established_on, logo_url, accent_color, active, display_order",
    )
    .order("display_order", { ascending: true });

  // Member counts per chapter (via chapter_memberships)
  const { data: memberships } = await svc
    .from("chapter_memberships")
    .select("chapter_id");

  const counts = new Map<string, number>();
  (memberships ?? []).forEach((m) => {
    counts.set(m.chapter_id, (counts.get(m.chapter_id) ?? 0) + 1);
  });

  const rows = ((chapters ?? []) as Chapter[]).map((c) => ({
    ...c,
    member_count: counts.get(c.id) ?? 0,
  }));

  return (
    <>
      <PageHeader
        title="Chapters"
        description="The state-level registry of UPCBMA chapters. Creating a new chapter here enables admins to scope their work to it."
      />

      {error && (
        <div className="mb-5 flex gap-3 rounded-sm border border-red-200 bg-red-50 p-4">
          <AlertTriangle
            className="mt-0.5 h-5 w-5 shrink-0 text-red-700"
            strokeWidth={1.75}
          />
          <div className="text-sm text-red-900">{error}</div>
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

      <ChaptersTable rows={rows} />
    </>
  );
}
