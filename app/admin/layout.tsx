import { Sidebar } from "@/components/admin/sidebar";
import { SignOutButton } from "@/components/admin/signout-button";
import { getAuthedAdmin } from "@/lib/auth";
import Link from "next/link";
import { UserCircle } from "lucide-react";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Single source of truth for the "is this person allowed?" check.
  // Redirects to /login or / if not authorised.
  const me = await getAuthedAdmin();

  return (
    <div className="grid min-h-screen grid-cols-[240px_1fr]">
      <aside className="flex flex-col border-r border-border bg-bg p-4">
        <Link href="/admin" className="mb-6 block no-underline">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
            UPCBMA Kanpur
          </div>
          <div className="mt-0.5 text-sm font-semibold text-heading">
            Admin
          </div>
        </Link>

        <Sidebar />

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
                {me.name}
              </div>
              <div className="truncate text-[11px] text-muted">
                {me.role}
              </div>
            </div>
          </Link>
          <SignOutButton />
        </div>
      </aside>

      <main className="overflow-x-hidden bg-bg">
        <div className="mx-auto max-w-6xl px-8 py-10">{children}</div>
      </main>
    </div>
  );
}
