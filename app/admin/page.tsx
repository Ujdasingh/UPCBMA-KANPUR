import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/admin/page-header";
import { createServiceClient } from "@/lib/supabase/server";
import { getAdminContext, isSuperAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Stat = {
  label: string;
  value: string | number;
  hint?: string;
};

async function fetchStats(opts: {
  canSeeSuperAdmin: boolean;
  chapterId: string | null;
}): Promise<Stat[]> {
  const supabase = createServiceClient();
  const { chapterId, canSeeSuperAdmin } = opts;

  // Members: active roster. Chapter-scoped via chapter_memberships when set.
  let membersQuery;
  if (chapterId) {
    membersQuery = supabase
      .from("chapter_memberships")
      .select("members!inner(id,role,active)", { count: "exact", head: true })
      .eq("chapter_id", chapterId)
      .eq("members.active", true);
  } else {
    membersQuery = supabase
      .from("members")
      .select("*", { head: true, count: "exact" })
      .eq("active", true);
  }
  if (!canSeeSuperAdmin && chapterId) {
    // PostgREST doesn't support filtering inner joins with neq on role cleanly,
    // so fall back to the plain members table.
    membersQuery = supabase
      .from("members")
      .select("*", { head: true, count: "exact" })
      .eq("active", true)
      .neq("role", "super_admin");
  } else if (!canSeeSuperAdmin) {
    membersQuery = supabase
      .from("members")
      .select("*", { head: true, count: "exact" })
      .eq("active", true)
      .neq("role", "super_admin");
  }

  // Helper: add chapter filter to a scoped query if chapterId is set.
  const withChapter = <T extends { eq: (k: string, v: string) => T }>(q: T) =>
    chapterId ? q.eq("chapter_id", chapterId) : q;

  const today = new Date().toISOString().slice(0, 10);

  const [
    membersActive,
    apptActive,
    bookingsPending,
    messagesNew,
    newsTotal,
    eventsUpcoming,
    labTestsActive,
  ] = await Promise.all([
    membersQuery,
    withChapter(
      supabase
        .from("committee_appointments")
        .select("*", { head: true, count: "exact" })
        .eq("status", "active"),
    ),
    withChapter(
      supabase
        .from("bookings")
        .select("*", { head: true, count: "exact" })
        .eq("status", "pending"),
    ),
    // contact_messages.chapter_id is nullable — include NULL (state) for
    // chapter-scoped views too since chapter admins also handle state-routed items.
    chapterId
      ? supabase
          .from("contact_messages")
          .select("*", { head: true, count: "exact" })
          .eq("status", "new")
          .or(`chapter_id.eq.${chapterId},chapter_id.is.null`)
      : supabase
          .from("contact_messages")
          .select("*", { head: true, count: "exact" })
          .eq("status", "new"),
    chapterId
      ? supabase
          .from("news")
          .select("*", { head: true, count: "exact" })
          .or(`chapter_id.eq.${chapterId},chapter_id.is.null`)
      : supabase.from("news").select("*", { head: true, count: "exact" }),
    chapterId
      ? supabase
          .from("events")
          .select("*", { head: true, count: "exact" })
          .gte("event_date", today)
          .or(`chapter_id.eq.${chapterId},chapter_id.is.null`)
      : supabase
          .from("events")
          .select("*", { head: true, count: "exact" })
          .gte("event_date", today),
    withChapter(
      supabase
        .from("lab_tests_catalog")
        .select("*", { head: true, count: "exact" })
        .eq("active", true),
    ),
  ]);

  return [
    {
      label: "Active members",
      value: membersActive.count ?? 0,
      hint: chapterId ? "In this chapter" : "Across all chapters",
    },
    {
      label: "Committee seats",
      value: apptActive.count ?? 0,
      hint: "Currently held",
    },
    {
      label: "Bookings pending",
      value: bookingsPending.count ?? 0,
      hint: "Awaiting confirmation",
    },
    {
      label: "Unread messages",
      value: messagesNew.count ?? 0,
      hint: "From contact form",
    },
    {
      label: "News items",
      value: newsTotal.count ?? 0,
      hint: "Published to date",
    },
    {
      label: "Upcoming events",
      value: eventsUpcoming.count ?? 0,
      hint: "From today forward",
    },
    {
      label: "Active lab tests",
      value: labTestsActive.count ?? 0,
      hint: "In catalog",
    },
  ];
}

export default async function DashboardPage() {
  const ctx = await getAdminContext();
  const stats = await fetchStats({
    canSeeSuperAdmin: isSuperAdmin(ctx.me),
    chapterId: ctx.activeChapterId,
  });

  return (
    <>
      <PageHeader
        title={
          ctx.activeChapter
            ? `Dashboard · ${ctx.activeChapter.name}`
            : "Dashboard · All chapters"
        }
        description={
          ctx.activeChapter
            ? `Live snapshot for ${ctx.activeChapter.name}.`
            : "Live snapshot across every chapter. Switch to a chapter in the sidebar to focus."
        }
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
              {s.label}
            </div>
            <div className="mt-2 text-3xl font-semibold text-heading tabular-nums">
              {s.value}
            </div>
            {s.hint && <div className="mt-1 text-xs text-muted">{s.hint}</div>}
          </Card>
        ))}
      </div>
    </>
  );
}
