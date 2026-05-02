import Link from "next/link";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/admin/page-header";
import {
  OnboardingChecklist,
  type OnboardingItem,
} from "@/components/admin/onboarding-checklist";
import { createServiceClient } from "@/lib/supabase/server";
import { getAdminContext, isSuperAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Stat = {
  label: string;
  value: string | number;
  hint?: string;
  /** Optional link target — turns the tile into a one-click jump to the
   *  matching admin module so users don't have to hunt in the sidebar. */
  href?: string;
};

async function fetchStats(opts: {
  canSeeSuperAdmin: boolean;
  chapterId: string | null;
}): Promise<Stat[]> {
  const supabase = createServiceClient();
  const { chapterId, canSeeSuperAdmin } = opts;

  // Members card on the admin dashboard counts *paying* members only — the
  // page already has a separate "Admins" / staff surface elsewhere, and the
  // user expects this number to match the public-facing roster headline.
  let membersQuery;
  if (chapterId) {
    membersQuery = supabase
      .from("chapter_memberships")
      .select("member:members!inner(role,active)", {
        count: "exact",
        head: true,
      })
      .eq("chapter_id", chapterId)
      .eq("member.active", true)
      .eq("member.role", "member");
  } else {
    membersQuery = supabase
      .from("members")
      .select("*", { head: true, count: "exact" })
      .eq("active", true)
      .eq("role", "member");
  }
  // canSeeSuperAdmin no longer needs a separate branch — once we filter to
  // role = "member", super_admins are excluded everywhere by definition.
  void canSeeSuperAdmin;

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
      href: "/admin/members",
    },
    {
      label: "Committee seats",
      value: apptActive.count ?? 0,
      hint: "Currently held",
      href: "/admin/committee",
    },
    {
      label: "Bookings pending",
      value: bookingsPending.count ?? 0,
      hint: "Awaiting confirmation",
      href: "/admin/bookings",
    },
    {
      label: "Unread messages",
      value: messagesNew.count ?? 0,
      hint: "From contact form",
      href: "/admin/messages",
    },
    {
      label: "News items",
      value: newsTotal.count ?? 0,
      hint: "Published to date",
      href: "/admin/news",
    },
    {
      label: "Upcoming events",
      value: eventsUpcoming.count ?? 0,
      hint: "From today forward",
      href: "/admin/events",
    },
    {
      label: "Active lab tests",
      value: labTestsActive.count ?? 0,
      hint: "In catalog",
      href: "/admin/lab-tests",
    },
  ];
}

/**
 * Build the onboarding checklist for a chapter-scoped dashboard.
 *
 * "Done" is derived from the same numbers we already fetched for the stat
 * tiles, plus two extra cheap lookups (office_info presence, chapter row).
 * Returns null when there's no active chapter — the checklist only makes
 * sense when the admin has a specific chapter selected.
 */
async function fetchOnboarding(
  ctx: Awaited<ReturnType<typeof getAdminContext>>,
  stats: Stat[],
): Promise<OnboardingItem[] | null> {
  if (!ctx.activeChapter) return null;
  const chapter = ctx.activeChapter;
  const supabase = createServiceClient();

  // Pull the bits the stat tiles don't already cover.
  const { data: office } = await supabase
    .from("office_info")
    .select("address")
    .eq("chapter_id", chapter.id)
    .maybeSingle();

  const num = (label: string) => {
    const v = stats.find((s) => s.label === label)?.value;
    return typeof v === "number" ? v : Number(v) || 0;
  };

  return [
    {
      key: "members",
      done: num("Active members") > 0,
      title: "Invite your first members",
      description:
        "They get a personal invite email and land on the chapter the moment they accept.",
      href: "/admin/members",
      cta: "Invite",
    },
    {
      key: "committee",
      done: num("Committee seats") > 0,
      title: "Appoint a committee",
      description:
        "Roles you assign show up in the public 'Leadership' section. Without this, the chapter page reads 'Committee to be announced'.",
      href: "/admin/committee",
      cta: "Add appointment",
    },
    {
      key: "office",
      done: !!office?.address,
      title: "Set the office address & contact",
      description:
        "Visitors look here for the address, email, and visiting hours. Empty office info shows 'Contact details to be published.' on the public page.",
      href: "/admin/office-info",
      cta: "Update office",
    },
    {
      key: "established",
      done: !!chapter.established_on,
      title: "Set the chapter's establishment year",
      description:
        "Adds the 'Established' tile to the chapter hero — a small but meaningful credibility signal.",
      href: "/admin/chapters",
      cta: "Edit chapter",
    },
    {
      key: "news",
      done: num("News items") > 0,
      title: "Publish a first news post",
      description:
        "Even a one-line announcement keeps the page from looking dormant.",
      href: "/admin/news",
      cta: "Add news",
    },
    {
      key: "events",
      done: num("Upcoming events") > 0,
      title: "Add an upcoming meet or event",
      description:
        "Lets members plan, and gives the chapter page something forward-looking.",
      href: "/admin/events",
      cta: "Add event",
    },
    {
      key: "lab",
      done: num("Active lab tests") > 0,
      title: "Activate the lab catalogue",
      description:
        "Visitors can see what tests you offer and start booking. Without this, the lab page is empty.",
      href: "/admin/lab-tests",
      cta: "Set up lab",
    },
  ];
}

export default async function DashboardPage() {
  const ctx = await getAdminContext();
  const stats = await fetchStats({
    canSeeSuperAdmin: isSuperAdmin(ctx.me),
    chapterId: ctx.activeChapterId,
  });
  const onboarding = await fetchOnboarding(ctx, stats);

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

      {onboarding && ctx.activeChapter && (
        <OnboardingChecklist
          items={onboarding}
          chapterName={ctx.activeChapter.name}
        />
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => {
          const body = (
            <>
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                {s.label}
              </div>
              <div className="mt-2 text-3xl font-semibold text-heading tabular-nums">
                {s.value}
              </div>
              {s.hint && <div className="mt-1 text-xs text-muted">{s.hint}</div>}
            </>
          );
          // Tiles with an href become one-click jumps to the matching admin
          // module — saves a sidebar trip on every dashboard glance.
          return s.href ? (
            <Link
              key={s.label}
              href={s.href}
              className="block no-underline transition-colors hover:bg-surface focus-visible:bg-surface focus-visible:outline-none rounded-sm"
            >
              <Card>{body}</Card>
            </Link>
          ) : (
            <Card key={s.label}>{body}</Card>
          );
        })}
      </div>
    </>
  );
}
