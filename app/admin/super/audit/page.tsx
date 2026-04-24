import { redirect } from "next/navigation";
import { PageHeader } from "@/components/admin/page-header";
import { Card } from "@/components/ui/card";
import { createServiceClient } from "@/lib/supabase/server";
import { resolveAuthIdentity, isSuperAdmin } from "@/lib/auth";
import { ScrollText } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Audit log — Super admin" };

export default async function AuditPage() {
  const { real } = await resolveAuthIdentity();
  if (!isSuperAdmin(real)) redirect("/admin");

  const svc = createServiceClient();
  const { data: rows } = await svc
    .from("admin_audit_log")
    .select("id, actor_id, acting_as_id, action, target_table, target_id, diff, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  // Resolve names for actor_id / acting_as_id
  const memberIds = new Set<string>();
  (rows ?? []).forEach((r) => {
    if (r.actor_id) memberIds.add(r.actor_id);
    if (r.acting_as_id) memberIds.add(r.acting_as_id);
  });
  const { data: people } = await svc
    .from("members")
    .select("id, name")
    .in("id", Array.from(memberIds).length ? Array.from(memberIds) : ["__none__"]);
  const nameById = new Map<string, string>();
  (people ?? []).forEach((p) => nameById.set(p.id, p.name));

  return (
    <>
      <PageHeader
        title="Audit log"
        description="Sensitive admin actions. Most recent first. Last 200 rows."
      />

      {!rows || rows.length === 0 ? (
        <Card>
          <div className="flex gap-3">
            <ScrollText className="mt-0.5 h-5 w-5 shrink-0 text-muted" strokeWidth={1.75} />
            <div className="text-sm text-text">No audit rows yet. Actions like impersonation start/stop and admin-scope grants/revokes will appear here.</div>
          </div>
        </Card>
      ) : (
        <Card>
          <ul className="divide-y divide-border">
            {rows.map((r) => (
              <li key={r.id} className="flex items-start justify-between gap-4 py-3">
                <div className="min-w-0">
                  <div className="font-mono text-xs text-muted">
                    {new Date(r.created_at).toISOString().replace("T", " ").slice(0, 19)}
                  </div>
                  <div className="mt-0.5 text-sm">
                    <span className="font-medium text-heading">
                      {nameById.get(r.actor_id ?? "") ?? r.actor_id ?? "(unknown)"}
                    </span>{" "}
                    <span className="text-muted">{r.action.replace(/_/g, " ")}</span>
                    {r.acting_as_id && (
                      <>
                        {" "}
                        <span className="text-muted">as</span>{" "}
                        <span className="font-medium text-heading">
                          {nameById.get(r.acting_as_id) ?? r.acting_as_id}
                        </span>
                      </>
                    )}
                  </div>
                  {r.target_table && (
                    <div className="mt-0.5 text-xs text-muted">
                      target: <code className="font-mono">{r.target_table}</code>
                      {r.target_id && <> · <code className="font-mono">{r.target_id}</code></>}
                    </div>
                  )}
                  {r.diff && (
                    <pre className="mt-1 max-w-full overflow-x-auto text-[11px] text-muted">
                      {JSON.stringify(r.diff, null, 2)}
                    </pre>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
