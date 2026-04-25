import { Sidebar } from "@/components/admin/sidebar";
import { SignOutButton } from "@/components/admin/signout-button";
import { ChapterSwitcher } from "@/components/admin/chapter-switcher";
import { Logo } from "@/components/public/logo";
import { getAdminContext } from "@/lib/auth";
import { stopImpersonation } from "./super/actions";
import Link from "next/link";
import { UserCircle, UserCheck } from "lucide-react";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getAdminContext();

  return (
    <div className="grid min-h-screen grid-cols-[260px_1fr]">
      <aside className="flex flex-col border-r border-border bg-bg p-4">
        <Link href="/admin" className="mb-6 inline-flex items-center gap-2.5 no-underline">
          <Logo size={32} />
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
              UPCBMA
            </div>
            <div className="mt-0.5 text-sm font-semibold text-heading">
              Admin
            </div>
          </div>
        </Link>

        {ctx.availableChapters.length > 0 && (
          <ChapterSwitcher
            chapters={ctx.availableChapters}
            activeSlug={ctx.activeChapter?.slug ?? null}
            canSeeAll={ctx.canSeeAllChapters}
          />
        )}

        <Sidebar isSuper={ctx.isSuper} />

        <div className="mt-auto space-y-2 border-t border-border pt-4">
          <Link
            href="/admin/profile"
            className="group flex items-start gap-2 rounded-sm px-3 py-2 no-underline hover:bg-surface"
          >
            <UserCircle
              className="mt-0.5 h-4 w-4 shrink-0 text-muted group-hover:text-heading"
              strokeWidth={1.75}
            />
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                Signed in
              </div>
              <div className="truncate text-sm font-medium text-heading">
                {ctx.me.name}
              </div>
              <div className="truncate text-[11px] text-muted">
                {ctx.me.role}
              </div>
            </div>
          </Link>
          <SignOutButton />
        </div>
      </aside>

      <main className="overflow-x-hidden bg-bg">
        {ctx.isImpersonating && (
          <div className="border-b border-amber-300 bg-amber-50">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-8 py-2 text-xs">
              <div className="flex items-center gap-2 text-amber-900">
                <UserCheck className="h-3.5 w-3.5" strokeWidth={2} />
                <span>
                  Viewing as <strong>{ctx.me.name}</strong> (
                  <span className="font-mono">{ctx.me.role}</span>). Real
                  actor: {ctx.realActor.name}.
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
        <div className="mx-auto max-w-6xl px-8 py-10">{children}</div>
      </main>
    </div>
  );
}
