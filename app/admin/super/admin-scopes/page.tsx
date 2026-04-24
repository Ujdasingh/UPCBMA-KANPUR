import { redirect } from "next/navigation";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/input";
import { createServiceClient } from "@/lib/supabase/server";
import { resolveAuthIdentity, isSuperAdmin } from "@/lib/auth";
import { grantScope, revokeScope } from "../actions";
import { AlertTriangle, CheckCircle2, Shield, Trash2 } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin scopes — Super admin" };

export default async function AdminScopesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { error, ok } = await searchParams;
  const { real } = await resolveAuthIdentity();
  if (!isSuperAdmin(real)) redirect("/admin");

  const svc = createServiceClient();

  const [
    { data: admins },
    { data: chapters },
    { data: scopes },
  ] = await Promise.all([
    svc.from("members").select("id, name, email, role").eq("role", "admin").order("name"),
    svc.from("chapters").select("id, slug, name, active").eq("active", true).order("display_order"),
    svc.from("admin_scopes").select("id, member_id, chapter_id, granted_at").order("granted_at", { ascending: false }),
  ]);

  // Build per-admin scope list
  const scopesByMember = new Map<string, typeof scopes>();
  (scopes ?? []).forEach((s) => {
    if (!scopesByMember.has(s.member_id)) scopesByMember.set(s.member_id, []);
    scopesByMember.get(s.member_id)!.push(s);
  });

  return (
    <>
      <PageHeader
        title="Admin scopes"
        description="Which admins can manage which chapters. NULL chapter = state-wide access."
      />

      {error && (
        <div className="mb-5 flex gap-3 rounded-sm border border-red-200 bg-red-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" strokeWidth={1.75} />
          <div className="text-sm text-red-900">{error}</div>
        </div>
      )}
      {ok && (
        <div className="mb-5 flex gap-3 rounded-sm border border-emerald-200 bg-emerald-50 p-4">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" strokeWidth={1.75} />
          <div className="text-sm text-emerald-900">{ok}</div>
        </div>
      )}

      {(admins ?? []).length === 0 ? (
        <Card>
          <div className="flex gap-3">
            <Shield className="mt-0.5 h-5 w-5 shrink-0 text-muted" strokeWidth={1.75} />
            <div className="text-sm">
              <div className="font-semibold text-heading">No admin accounts yet</div>
              <p className="mt-1 text-muted">
                Create admin accounts in Members (give them a login + role
                &lsquo;admin&rsquo;). Chapter admin creation from a chapter
                view auto-assigns the scope; admins added from the
                &ldquo;All chapters&rdquo; view need a scope granted here.
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {(admins ?? []).map((a) => {
            const mine = scopesByMember.get(a.id) ?? [];
            const hasStateWide = mine.some((s) => s.chapter_id === null);
            return (
              <Card key={a.id}>
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-heading">{a.name}</div>
                    <div className="text-xs text-muted">{a.email}</div>
                  </div>
                  <Badge tone="warn">admin</Badge>
                </div>

                <div className="mb-4 flex flex-wrap gap-2">
                  {hasStateWide && (
                    <span className="rounded-sm border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-900">
                      state-wide
                    </span>
                  )}
                  {mine
                    .filter((s) => s.chapter_id !== null)
                    .map((s) => {
                      const chapter = (chapters ?? []).find((c) => c.id === s.chapter_id);
                      return (
                        <form key={s.id} action={async () => {
                          "use server";
                          await revokeScope(s.id);
                        }}>
                          <button
                            type="submit"
                            className="inline-flex items-center gap-1 rounded-sm border border-border bg-surface px-2 py-0.5 text-[11px] font-medium text-heading hover:border-heading"
                            title="Revoke scope"
                          >
                            {chapter?.name ?? "?"}
                            <Trash2 className="h-3 w-3 text-muted" />
                          </button>
                        </form>
                      );
                    })}
                  {mine.length === 0 && (
                    <span className="text-xs text-muted">No scopes — this admin can&rsquo;t see anything yet.</span>
                  )}
                </div>

                <form action={grantScope} className="flex flex-wrap items-end gap-2 border-t border-border pt-4">
                  <input type="hidden" name="member_id" value={a.id} />
                  <Field label="Grant new scope" htmlFor={`grant-${a.id}`}>
                    <Select id={`grant-${a.id}`} name="chapter_id" defaultValue="">
                      <option value="" disabled>
                        Pick a chapter…
                      </option>
                      {(chapters ?? []).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                      <option value="" disabled>── or ──</option>
                      <option value="">State-wide (all chapters)</option>
                    </Select>
                  </Field>
                  <Button type="submit" variant="secondary" size="sm">
                    Grant
                  </Button>
                </form>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
