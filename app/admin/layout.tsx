import { Sidebar } from "@/components/admin/sidebar";
import { SignOutButton } from "@/components/admin/signout-button";
import { ChapterSwitcher } from "@/components/admin/chapter-switcher";
import { LockBanner } from "@/components/admin/lock-banner";
import { AdminShell } from "@/components/admin/admin-shell";
import { Logo } from "@/components/public/logo";
import { getAdminContext } from "@/lib/auth";
import { resolveTier } from "@/lib/tier";
import { getStateLogoUrl } from "@/lib/site-settings";
import { stopImpersonation } from "./super/actions";
import Link from "next/link";
import { ExternalLink, UserCircle, UserCheck } from "lucide-react";

// Always fetch fresh — the sidebar items (especially super_admin entries),
// active chapter, and lock banner depend on auth state, so we never want the
// layout served from the static cache.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getAdminContext();
  // Same uploaded logo as the public nav so the admin panel doesn't fall back
  // to the bundled placeholder when an org has set its own brand.
  const logoSrc = await getStateLogoUrl();
  // Tier label — replaces the raw role string ("admin"/"member") in the
  // sidebar identity card with a friendlier "Tier 3 · Chapter Admin ·
  // Kanpur" that tells the holder which seat their rights flow from.
  const tier = await resolveTier(ctx.me.id);

  // The contents of the sidebar — same on desktop and inside the mobile
  // drawer. Keeping this as a single ReactNode lets AdminShell render it in
  // the right place per breakpoint.
  const sidebarContent = (
    <>
      {/* Logo links to the public website home (per spec). The "Admin"
          wordmark below it stays distinct so the panel still feels labelled. */}
      <div className="mb-6 flex items-center gap-2.5">
        <Link href="/" className="shrink-0 no-underline" aria-label="UPCBMA website home">
          <Logo size={32} src={logoSrc} />
        </Link>
        <Link href="/admin" className="no-underline">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
            UPCBMA
          </div>
          <div className="mt-0.5 text-sm font-semibold text-heading">Admin</div>
        </Link>
      </div>

      {ctx.availableChapters.length > 0 && (
        <ChapterSwitcher
          chapters={ctx.availableChapters}
          activeSlug={ctx.activeChapter?.slug ?? null}
          canSeeAll={ctx.canSeeAllChapters}
        />
      )}

      <Sidebar
        isSuper={ctx.isSuper}
        isStateAdmin={
          ctx.isSuper ||
          ctx.me.role === "admin" ||
          ctx.scopes.some((s) => s.chapter_id === null)
        }
      />

      <div className="mt-auto space-y-2 border-t border-border pt-4">
        <Link
          href="/"
          className="group flex items-center gap-2 rounded-sm px-3 py-2 text-sm font-medium text-heading no-underline hover:bg-surface"
        >
          <ExternalLink
            className="h-4 w-4 shrink-0 text-muted group-hover:text-heading"
            strokeWidth={1.75}
          />
          Visit website
        </Link>
        <Link
          href="/me"
          className="group flex items-start gap-2 rounded-sm px-3 py-2 no-underline hover:bg-surface"
        >
          <UserCircle
            className="mt-0.5 h-4 w-4 shrink-0 text-muted group-hover:text-heading"
            strokeWidth={1.75}
          />
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              Signed in
            </div>
            <div className="truncate text-sm font-medium text-heading">
              {ctx.me.name}
            </div>
            <div
              className="truncate text-[11px] text-muted"
              title={tier.longLabel}
            >
              {tier.label}
            </div>
          </div>
        </Link>
        <SignOutButton />
      </div>
    </>
  );

  // Banners stack above the main column on every page. Lock banner is server
  // because it queries the DB; impersonation banner is rendered inline.
  const banners = (
    <>
      {/* @ts-expect-error Server Component */}
      <LockBanner isSuper={ctx.isSuper} activeChapter={ctx.activeChapter} />
      {ctx.isImpersonating && (
        <div className="border-b border-amber-300 bg-amber-50">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2 text-xs md:px-8">
            <div className="flex items-center gap-2 text-amber-900">
              <UserCheck className="h-3.5 w-3.5" strokeWidth={2} />
              <span>
                Viewing as <strong>{ctx.me.name}</strong> (
                <span className="font-mono">{ctx.me.role}</span>). Real actor:{" "}
                {ctx.realActor.name}.
              </span>
            </div>
            <form action={stopImpersonation}>
              <button
                type="submit"
                className="rounded-sm border border-amber-400 bg-white px-2 py-0.5 text-xs font-medium text-amber-900 hover:bg-amber-100"
              >
                Exit impersonation
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );

  return (
    <AdminShell sidebarContent={sidebarContent} banners={banners}>
      {children}
    </AdminShell>
  );
}
