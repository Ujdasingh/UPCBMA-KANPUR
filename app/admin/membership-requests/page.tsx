import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createServiceClient } from "@/lib/supabase/server";
import { getAdminContext } from "@/lib/auth";
import { setRequestStatus, deleteRequest } from "./actions";
import { Mail, Phone, Building2, MapPin, Inbox } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Membership requests — UPCBMA Admin" };

const TABS = [
  { key: "new",       label: "New"        },
  { key: "contacted", label: "Contacted"  },
  { key: "approved",  label: "Approved"   },
  { key: "declined",  label: "Declined"   },
  { key: "all",       label: "All"        },
] as const;

export default async function MembershipRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const activeTab = TABS.find((t) => t.key === tab) ?? TABS[0];
  const ctx = await getAdminContext();
  const svc = createServiceClient();

  let q = svc
    .from("membership_requests")
    .select("*, chapter:chapters(slug, name, city)")
    .order("created_at", { ascending: false });
  if (ctx.activeChapterId) {
    q = q.or(`chapter_id.eq.${ctx.activeChapterId},chapter_id.is.null`);
  }
  if (activeTab.key !== "all") {
    q = q.eq("status", activeTab.key);
  }
  const { data: rows, error } = await q;

  // Pending count for the tab badge
  let newCountQ = svc
    .from("membership_requests")
    .select("*", { head: true, count: "exact" })
    .eq("status", "new");
  if (ctx.activeChapterId) {
    newCountQ = newCountQ.or(`chapter_id.eq.${ctx.activeChapterId},chapter_id.is.null`);
  }
  const { count: newCount } = await newCountQ;

  return (
    <>
      <PageHeader
        title={
          ctx.activeChapter
            ? `Membership requests · ${ctx.activeChapter.name}`
            : "Membership requests · All chapters"
        }
        description="People applying to join UPCBMA. Confirm them as members in /admin/members once you've spoken to them."
      />

      {/* Tabs */}
      <div className="mb-5 flex flex-wrap gap-1 border-b border-border">
        {TABS.map((t) => {
          const isActive = t.key === activeTab.key;
          return (
            <Link
              key={t.key}
              href={t.key === "new" ? "/admin/membership-requests" : `/admin/membership-requests?tab=${t.key}`}
              className={
                "inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm no-underline transition-colors " +
                (isActive
                  ? "border-heading text-heading font-semibold"
                  : "border-transparent text-text hover:text-heading")
              }
            >
              {t.label}
              {t.key === "new" && newCount != null && newCount > 0 && (
                <span className="rounded-full bg-amber-100 px-1.5 text-[10px] font-semibold text-amber-900">
                  {newCount}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {error && (
        <p className="text-sm text-danger">
          Failed to load: {error.message}
          {/relation .* does not exist/i.test(error.message) && (
            <> (Run <code className="font-mono">migration-membership-requests.sql</code> in Supabase first.)</>
          )}
        </p>
      )}

      {(rows ?? []).length === 0 ? (
        <Card>
          <div className="flex items-start gap-3">
            <Inbox className="mt-0.5 h-5 w-5 shrink-0 text-muted" strokeWidth={1.75} />
            <div className="text-sm text-text">
              No requests in this view.
            </div>
          </div>
        </Card>
      ) : (
        <ul className="space-y-4">
          {(rows ?? []).map((r) => {
            const ch = Array.isArray(r.chapter) ? r.chapter[0] : r.chapter;
            return (
              <li key={r.id}>
                <Card>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <h3 className="text-base font-semibold text-heading">{r.name}</h3>
                        <Badge tone={r.status === "new" ? "warn" : r.status === "approved" ? "success" : r.status === "declined" ? "danger" : "neutral"}>
                          {r.status}
                        </Badge>
                        <span className="text-xs text-muted">
                          {new Date(r.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                        </span>
                      </div>
                      <div className="mt-2 grid gap-1 text-sm md:grid-cols-2">
                        <div className="flex items-center gap-1.5 text-text">
                          <Building2 className="h-3.5 w-3.5 text-muted" strokeWidth={1.75} />
                          {r.company}
                        </div>
                        <div className="flex items-center gap-1.5 text-text">
                          <Mail className="h-3.5 w-3.5 text-muted" strokeWidth={1.75} />
                          <a href={`mailto:${r.email}`} className="no-underline text-text hover:text-heading">{r.email}</a>
                        </div>
                        {r.phone && (
                          <div className="flex items-center gap-1.5 text-text">
                            <Phone className="h-3.5 w-3.5 text-muted" strokeWidth={1.75} />
                            <a href={`tel:${r.phone}`} className="no-underline text-text hover:text-heading">{r.phone}</a>
                          </div>
                        )}
                        {(r.city || r.state) && (
                          <div className="flex items-center gap-1.5 text-text">
                            <MapPin className="h-3.5 w-3.5 text-muted" strokeWidth={1.75} />
                            {[r.city, r.state].filter(Boolean).join(", ")}
                          </div>
                        )}
                      </div>
                      <div className="mt-3 grid gap-1 text-xs text-muted md:grid-cols-3">
                        {ch && <div>Preferred chapter: <span className="text-text">{ch.name}</span></div>}
                        {r.category_preference && <div>Category preference: <span className="text-text">{r.category_preference}</span></div>}
                        {r.manufacturing_capacity && <div>Capacity: <span className="text-text">{r.manufacturing_capacity}</span></div>}
                      </div>
                      {r.notes && (
                        <p className="mt-3 whitespace-pre-wrap rounded-sm border border-border bg-surface p-3 text-xs text-text">
                          {r.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 flex-col gap-1">
                      <form action={async () => { "use server"; await setRequestStatus(r.id, "contacted"); }}>
                        <Button type="submit" size="sm" variant="ghost">Mark contacted</Button>
                      </form>
                      <form action={async () => { "use server"; await setRequestStatus(r.id, "approved"); }}>
                        <Button type="submit" size="sm" variant="secondary">Approve</Button>
                      </form>
                      <form action={async () => { "use server"; await setRequestStatus(r.id, "declined"); }}>
                        <Button type="submit" size="sm" variant="ghost" className="text-danger">Decline</Button>
                      </form>
                      <form action={async () => { "use server"; await deleteRequest(r.id); }}>
                        <Button type="submit" size="sm" variant="ghost">Delete</Button>
                      </form>
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
