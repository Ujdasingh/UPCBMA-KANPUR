import { redirect } from "next/navigation";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { createServiceClient } from "@/lib/supabase/server";
import { resolveAuthIdentity, isSuperAdmin } from "@/lib/auth";
import { listActiveLocks, LOCK_CATEGORIES } from "@/lib/locks";
import { createLock, releaseLock } from "./actions";
import {
  AlertTriangle,
  CheckCircle2,
  Lock,
  ShieldAlert,
  Unlock,
} from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Site locks — Super admin" };

export default async function LocksPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { error, ok } = await searchParams;
  const { real } = await resolveAuthIdentity();
  if (!isSuperAdmin(real)) redirect("/admin");

  const svc = createServiceClient();
  const [locks, { data: chapters }] = await Promise.all([
    listActiveLocks(),
    svc
      .from("chapters")
      .select("id, name, slug")
      .eq("active", true)
      .order("display_order"),
  ]);

  // Resolve who placed each active lock (for display).
  const lockerIds = Array.from(
    new Set(locks.map((l) => l.locked_by).filter(Boolean) as string[]),
  );
  const memberById = new Map<string, string>();
  if (lockerIds.length > 0) {
    const { data: lockers } = await svc
      .from("members")
      .select("id, name")
      .in("id", lockerIds);
    (lockers ?? []).forEach((m: any) => memberById.set(m.id, m.name));
  }
  const chapterById = new Map<string, string>();
  (chapters ?? []).forEach((c: any) => chapterById.set(c.id, c.name));

  const okMessage =
    ok === "1"
      ? "Lock created. Affected mutations are now blocked for non-super_admins."
      : ok === "2"
        ? "Lock released."
        : null;

  return (
    <>
      <PageHeader
        title="Site locks"
        description="Block admins (and others) from making changes — global, category-wide, chapter-wide, or down to a single record. Super_admin can always override its own locks."
      />

      {error && (
        <div className="mb-6 flex gap-3 rounded-sm border border-red-200 bg-red-50 p-4">
          <AlertTriangle
            className="mt-0.5 h-5 w-5 shrink-0 text-red-700"
            strokeWidth={1.75}
          />
          <div className="text-sm text-red-900">{error}</div>
        </div>
      )}
      {okMessage && (
        <div className="mb-6 flex gap-3 rounded-sm border border-emerald-200 bg-emerald-50 p-4">
          <CheckCircle2
            className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700"
            strokeWidth={1.75}
          />
          <div className="text-sm text-emerald-900">{okMessage}</div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-[1fr_1fr]">
        {/* Create lock */}
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <Lock className="h-4 w-4 text-heading" strokeWidth={1.75} />
            <h2 className="text-base font-semibold text-heading">
              Create a new lock
            </h2>
          </div>
          <form action={createLock} className="space-y-4">
            <Field label="Scope" htmlFor="scope" required>
              <Select id="scope" name="scope" defaultValue="category">
                <option value="global">Global — block everything</option>
                <option value="category">
                  Category — block one type (optionally per chapter)
                </option>
                <option value="row">
                  Row — block a single record by id
                </option>
              </Select>
            </Field>

            <Field
              label="Category"
              htmlFor="category"
              hint="Required for category and row scope. Ignored for global."
            >
              <Select id="category" name="category" defaultValue="news">
                {LOCK_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="Chapter (optional)"
              htmlFor="chapter_id"
              hint="Leave on All chapters to lock that category everywhere."
            >
              <Select id="chapter_id" name="chapter_id" defaultValue="_all">
                <option value="_all">All chapters</option>
                {(chapters ?? []).map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="Resource ID"
              htmlFor="resource_id"
              hint="Only for Row scope. Paste the row's UUID (or natural id like a lab test code)."
            >
              <Input
                id="resource_id"
                name="resource_id"
                placeholder="e.g. f0e0… or BURST-01"
              />
            </Field>

            <Field
              label="Reason (optional)"
              htmlFor="reason"
              hint="Shown to admins who hit the lock. Be specific so they know who to ask."
            >
              <Input
                id="reason"
                name="reason"
                placeholder="e.g. AGM freeze — election in progress"
              />
            </Field>

            <div className="flex justify-end border-t border-border pt-4">
              <Button type="submit">
                <ShieldAlert className="h-4 w-4" />
                Lock now
              </Button>
            </div>
          </form>
        </Card>

        {/* Active locks list */}
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-heading">
              Active locks
            </h2>
            <Badge tone={locks.length > 0 ? "warn" : "neutral"}>
              {locks.length} active
            </Badge>
          </div>

          {locks.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-sm border border-dashed border-border bg-surface py-10 text-center">
              <Unlock className="h-7 w-7 text-muted" strokeWidth={1.5} />
              <p className="mt-3 text-sm text-muted">
                No locks. Admins can edit everything.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {locks.map((l) => (
                <li
                  key={l.id}
                  className="rounded-sm border border-border bg-bg p-4"
                >
                  <div className="flex items-start gap-3">
                    <Lock
                      className="mt-0.5 h-4 w-4 shrink-0 text-amber-700"
                      strokeWidth={1.75}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em]">
                        <span className="rounded-sm border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-amber-900">
                          {l.scope}
                        </span>
                        {l.category && (
                          <span className="text-muted">
                            {labelForCategory(l.category)}
                          </span>
                        )}
                        <span className="text-muted">
                          {l.chapter_id
                            ? (chapterById.get(l.chapter_id) ?? "(chapter)")
                            : "All chapters"}
                        </span>
                        {l.resource_id && (
                          <code className="rounded-sm border border-border bg-surface px-1.5 py-0.5 font-mono text-[10px] text-muted">
                            {l.resource_id.length > 14
                              ? l.resource_id.slice(0, 8) + "…"
                              : l.resource_id}
                          </code>
                        )}
                      </div>
                      {l.reason && (
                        <p className="mt-1.5 text-sm text-text">{l.reason}</p>
                      )}
                      <div className="mt-1.5 text-xs text-muted">
                        Locked{" "}
                        {new Date(l.locked_at).toLocaleString("en-IN", {
                          day: "numeric",
                          month: "short",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                        {l.locked_by && memberById.get(l.locked_by) && (
                          <> by {memberById.get(l.locked_by)}</>
                        )}
                      </div>
                    </div>
                    <form action={releaseLock}>
                      <input type="hidden" name="id" value={l.id} />
                      <Button
                        type="submit"
                        size="sm"
                        variant="ghost"
                        className="text-emerald-700"
                      >
                        <Unlock className="h-3.5 w-3.5" />
                        Release
                      </Button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-8 rounded-sm border border-border bg-surface p-5 text-sm">
        <div className="flex items-start gap-3">
          <ShieldAlert
            className="mt-0.5 h-4 w-4 shrink-0 text-muted"
            strokeWidth={1.75}
          />
          <div>
            <div className="font-semibold text-heading">How this works</div>
            <p className="mt-1 text-muted">
              Mutating server actions call{" "}
              <code className="font-mono text-xs">assertNotLocked()</code>{" "}
              before writing. If a matching active lock exists, the action is
              rejected with a friendly error showing the reason. Super_admin
              accounts bypass all locks — that&rsquo;s intentional, so a
              wrongly-set lock can always be released by you.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

function labelForCategory(c: string) {
  return LOCK_CATEGORIES.find((x) => x.value === c)?.label ?? c;
}
