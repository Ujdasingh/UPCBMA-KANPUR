import { Sidebar } from "@/components/admin/sidebar";
import { SignOutButton } from "@/components/admin/signout-button";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware should catch this, but double-check at the layout level.
  if (!user) redirect("/login");

  // Also check that the logged-in user has an admin role on our `members` table.
  const { data: member } = await supabase
    .from("members")
    .select("name, role")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  const isAdmin =
    member?.role === "admin" || member?.role === "super_admin";

  if (!isAdmin) {
    // Logged-in but not an admin. Send them home.
    redirect("/");
  }

  return (
    <div className="grid min-h-screen grid-cols-[240px_1fr]">
      <aside className="flex flex-col border-r border-border bg-bg p-4">
        <Link
          href="/admin"
          className="mb-6 block no-underline"
        >
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
            UPCBMA Kanpur
          </div>
          <div className="mt-0.5 text-sm font-semibold text-heading">
            Admin
          </div>
        </Link>

        <Sidebar />

        <div className="mt-auto border-t border-border pt-4">
          <div className="mb-3 px-3">
            <div className="text-xs text-muted">Signed in as</div>
            <div className="truncate text-sm font-medium">
              {member?.name ?? user.email}
            </div>
          </div>
          <SignOutButton />
        </div>
      </aside>

      <main className="overflow-x-hidden bg-bg">
        <div className="mx-auto max-w-6xl px-8 py-10">{children}</div>
      </main>
    </div>
  );
}
