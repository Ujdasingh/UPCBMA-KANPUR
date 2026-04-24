import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/admin/page-header";
import { resolveAuthIdentity, isSuperAdmin } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import {
  Network,
  UserCheck,
  ScrollText,
  Shield,
  Users,
} from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Super admin — UPCBMA" };

const tools = [
  {
    href: "/admin/chapters",
    Icon: Network,
    title: "Chapters",
    body: "Create, edit, or retire chapters. Set logos and accent colours.",
  },
  {
    href: "/admin/super/admin-scopes",
    Icon: Shield,
    title: "Admin scopes",
    body: "Grant or revoke chapter admin rights. Grant state-wide scope.",
  },
  {
    href: "/admin/super/impersonate",
    Icon: UserCheck,
    title: "Impersonate",
    body: "View the admin as any other member for debugging or support.",
  },
  {
    href: "/admin/super/audit",
    Icon: ScrollText,
    title: "Audit log",
    body: "Timeline of sensitive actions (impersonation, scope grants, etc.).",
  },
];

export default async function SuperHomePage() {
  const { real } = await resolveAuthIdentity();
  if (!isSuperAdmin(real)) redirect("/admin");

  return (
    <>
      <PageHeader
        title="Super admin"
        description="State-level tools visible only to super_admin. Power features, with a paper trail."
      />
      <div className="grid gap-4 md:grid-cols-2">
        {tools.map(({ href, Icon, title, body }) => (
          <Link key={href} href={href} className="no-underline">
            <Card className="hover:border-heading cursor-pointer">
              <div className="flex items-start gap-3">
                <Icon className="h-5 w-5 text-heading" strokeWidth={1.75} />
                <div>
                  <h3 className="text-base font-semibold text-heading">{title}</h3>
                  <p className="mt-1 text-sm text-muted">{body}</p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-10 rounded-sm border border-border bg-surface p-5 text-sm">
        <div className="flex items-start gap-3">
          <Users className="mt-0.5 h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
          <div>
            <div className="font-semibold text-heading">About these tools</div>
            <p className="mt-1 text-muted">
              The UI routes here exist for super_admin only (`{real.email}`). Every
              mutating action writes to <code className="font-mono text-xs">admin_audit_log</code> with
              both the real actor and, when impersonating, the effective identity.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
