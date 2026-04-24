import { PublicShell } from "@/components/public/shell";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/public/avatar";
import { Landmark } from "lucide-react";

export const metadata = {
  title: "Committee — UPCBMA Kanpur Chapter",
  description:
    "The current executive committee, zonal representatives, and advisors of the UPCBMA Kanpur Chapter.",
};

export const revalidate = 300;

// Display order of committee categories. Anything not in this list falls to the end.
const categoryOrder = [
  "executive",
  "office_bearer",
  "zonal",
  "advisory",
  "special",
] as const;

const categoryLabel: Record<string, string> = {
  executive: "Executive committee",
  office_bearer: "Office bearers",
  zonal: "Zonal representatives",
  advisory: "Advisors",
  special: "Special invitees",
};

export default async function CommitteePage() {
  const supabase = await createClient();

  const { data: appointmentsRaw } = await supabase
    .from("committee_appointments")
    .select(
      "id, area_name, term_start, term_end, display_order, notes, member:members(name, company, email, phone, role), role:committee_roles(key, name, category)",
    )
    .eq("status", "active")
    .order("display_order", { ascending: true });

  // Never expose super_admin accounts on the public site, even if one happens
  // to be assigned to a committee appointment.
  const appointments = (appointmentsRaw ?? []).filter((a) => {
    const m = Array.isArray(a.member) ? a.member[0] : a.member;
    return m?.role !== "super_admin";
  });

  // Group by role.category
  const groups: Record<string, typeof appointments> = {};
  for (const appt of appointments) {
    const role = Array.isArray(appt.role) ? appt.role[0] : appt.role;
    const cat = role?.category ?? "other";
    if (!groups[cat]) groups[cat] = [];
    groups[cat]!.push(appt);
  }
  const orderedKeys = [
    ...categoryOrder.filter((k) => groups[k]),
    ...Object.keys(groups).filter(
      (k) => !categoryOrder.includes(k as (typeof categoryOrder)[number]),
    ),
  ];

  return (
    <PublicShell>
      <section className="border-b border-border bg-surface">
        <div className="mx-auto max-w-3xl px-6 py-20">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
            Committee
          </div>
          <h1 className="mt-3 !tracking-tight">The people running the chapter.</h1>
          <p className="mt-5 text-lg leading-relaxed text-muted">
            The committee is elected by member companies and serves a fixed
            term. Office bearers handle day-to-day operations; zonal
            representatives carry issues from their regions; advisors provide
            continuity across terms.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        {orderedKeys.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Landmark className="h-8 w-8 text-muted" strokeWidth={1.5} />
            <h2 className="mt-4 !text-xl">Committee to be announced.</h2>
            <p className="mt-2 max-w-md text-sm text-muted">
              The current committee will be published here once elections are
              finalised.
            </p>
          </div>
        ) : (
          <div className="space-y-16">
            {orderedKeys.map((cat) => {
              const list = groups[cat] ?? [];
              return (
                <div key={cat}>
                  <div className="flex items-baseline justify-between border-b border-border pb-3">
                    <h2 className="!text-xl !tracking-tight">
                      {categoryLabel[cat] ?? capitalise(cat)}
                    </h2>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                      {list.length} {list.length === 1 ? "member" : "members"}
                    </div>
                  </div>

                  <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {list.map((c) => {
                      const member = Array.isArray(c.member) ? c.member[0] : c.member;
                      const role = Array.isArray(c.role) ? c.role[0] : c.role;
                      return (
                        <article
                          key={c.id}
                          className="rounded-sm border border-border bg-bg p-5"
                        >
                          <div className="flex items-start gap-3">
                            <Avatar name={member?.name ?? "?"} size="md" />
                            <div className="min-w-0">
                              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                                {role?.name ?? "Committee member"}
                                {c.area_name && (
                                  <span className="ml-1.5 text-muted/70">
                                    &middot; {c.area_name}
                                  </span>
                                )}
                              </div>
                              <div className="mt-0.5 text-base font-semibold text-heading">
                                {member?.name ?? "To be announced"}
                              </div>
                              {member?.company && (
                                <div className="truncate text-sm text-muted">
                                  {member.company}
                                </div>
                              )}
                            </div>
                          </div>

                          {(c.term_start || c.term_end) && (
                            <div className="mt-4 border-t border-border pt-3 text-xs text-muted">
                              Term:{" "}
                              {formatTermDate(c.term_start)} &ndash;{" "}
                              {formatTermDate(c.term_end)}
                            </div>
                          )}

                          {c.notes && (
                            <p className="mt-3 text-xs leading-relaxed text-muted">
                              {c.notes}
                            </p>
                          )}
                        </article>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </PublicShell>
  );
}

function formatTermDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric",
  });
}

function capitalise(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");
}
