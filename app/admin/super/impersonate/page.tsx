import { redirect } from "next/navigation";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createServiceClient } from "@/lib/supabase/server";
import { resolveAuthIdentity, isSuperAdmin } from "@/lib/auth";
import { startImpersonation, stopImpersonation } from "../actions";
import { AlertTriangle, UserCheck, X } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Impersonate — Super admin" };

export default async function ImpersonatePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; q?: string }>;
}) {
  const { error, q } = await searchParams;
  const { real, effective, isImpersonating } = await resolveAuthIdentity();
  if (!isSuperAdmin(real)) redirect("/admin");

  const svc = createServiceClient();
  const query = (q ?? "").trim();

  let membersQuery = svc
    .from("members")
    .select("id, name, email, role, company, active")
    .neq("id", real.id)
    .order("name", { ascending: true })
    .limit(50);
  if (query) {
    membersQuery = membersQuery.or(
      `name.ilike.%${query}%,email.ilike.%${query}%,id.ilike.%${query}%`,
    );
  }
  const { data: members } = await membersQuery;

  return (
    <>
      <PageHeader
        title="Impersonate"
        description="View the admin as any other member. Useful for debugging chapter-admin permissions."
      />

      {error && (
        <div className="mb-5 flex gap-3 rounded-sm border border-red-200 bg-red-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" strokeWidth={1.75} />
          <div className="text-sm text-red-900">{error}</div>
        </div>
      )}

      {isImpersonating ? (
        <Card className="mb-6 border-amber-300 bg-amber-50">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <UserCheck className="mt-0.5 h-5 w-5 text-amber-700" strokeWidth={1.75} />
              <div>
                <div className="text-sm font-semibold text-amber-900">
                  Currently viewing as {effective.name}
                </div>
                <div className="mt-0.5 text-xs text-amber-900/80">
                  {effective.email} · role {effective.role}
                </div>
              </div>
            </div>
            <form action={stopImpersonation}>
              <Button type="submit" variant="secondary">
                <X className="h-4 w-4" /> Exit impersonation
              </Button>
            </form>
          </div>
        </Card>
      ) : null}

      <Card>
        <form action="/admin/super/impersonate" method="get" className="mb-5 flex gap-2">
          <Input name="q" defaultValue={query} placeholder="Search by name, email, or ID…" />
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>
        <ul className="divide-y divide-border">
          {(members ?? []).map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-heading">{m.name}</span>
                  <Badge
                    tone={
                      m.role === "super_admin"
                        ? "danger"
                        : m.role === "admin"
                        ? "warn"
                        : "neutral"
                    }
                  >
                    {m.role}
                  </Badge>
                  {!m.active && <Badge tone="neutral">inactive</Badge>}
                </div>
                <div className="truncate text-xs text-muted">
                  {m.email} · {m.company ?? "—"}
                </div>
              </div>
              <form action={startImpersonation}>
                <input type="hidden" name="target_id" value={m.id} />
                <Button
                  type="submit"
                  size="sm"
                  variant="ghost"
                  disabled={m.role === "super_admin" && m.id !== real.id}
                >
                  View as
                </Button>
              </form>
            </li>
          ))}
          {(members ?? []).length === 0 && (
            <li className="py-12 text-center text-sm text-muted">
              No members matched &ldquo;{query}&rdquo;.
            </li>
          )}
        </ul>
      </Card>
    </>
  );
}
