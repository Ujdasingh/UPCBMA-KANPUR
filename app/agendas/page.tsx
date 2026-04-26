import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import { StateShell } from "@/components/public/state-shell";
import {
  AGENDA_CATEGORIES,
  categoryLabel,
  priorityTone,
  statusTone,
  type Agenda,
} from "@/lib/agendas";
import { Megaphone, Plus } from "lucide-react";

export const revalidate = 60;
export const metadata = {
  title: "Agendas — UPCBMA",
  description:
    "Live tracker of industry issues UPCBMA chapters are working on — gas, paper rates, supply, regulation, and more.",
};

export default async function AgendasListPage() {
  const svc = createServiceClient();

  const { data: agendas } = await svc
    .from("agendas")
    .select("*, chapter:chapters(slug, name)")
    .eq("approval_status", "approved")
    .eq("visibility", "public")
    .order("started_on", { ascending: false });

  // Group by status — Active first, then on_hold, then resolved/archived.
  const byStatus: Record<string, Agenda[]> = { active: [], on_hold: [], resolved: [], archived: [] };
  (agendas ?? []).forEach((a) => {
    if (!byStatus[a.status]) byStatus[a.status] = [];
    byStatus[a.status]!.push(a as Agenda);
  });

  return (
    <StateShell>
      <section className="border-b border-border bg-surface">
        <div className="mx-auto max-w-4xl px-6 py-12">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">Agendas</div>
              <h1 className="mt-3 !tracking-tight">What we&rsquo;re working on.</h1>
            </div>
            <Link
              href="/agendas/propose"
              className="inline-flex h-10 items-center gap-1.5 rounded-sm bg-heading px-4 text-sm font-medium text-white no-underline hover:bg-hover"
            >
              <Plus className="h-4 w-4" strokeWidth={2} />
              Propose an agenda
            </Link>
          </div>
          <p className="mt-4 max-w-prose text-[15px] leading-relaxed text-muted">
            Industry issues UPCBMA chapters are tracking — meeting the right
            people, sending the right letters, building the case for
            government. Anyone can propose; admins review and publish.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-10">
        {(agendas ?? []).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Megaphone className="h-8 w-8 text-muted" strokeWidth={1.5} />
            <h2 className="mt-4 !text-xl">No agendas published yet.</h2>
            <p className="mt-2 max-w-md text-sm text-muted">
              Be the first to propose one — sign in and click{" "}
              <Link href="/agendas/propose" className="underline">
                Propose an agenda
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {(["active", "on_hold", "resolved", "archived"] as const).map((status) => {
              const list = byStatus[status] ?? [];
              if (list.length === 0) return null;
              return (
                <div key={status}>
                  <div className="mb-4 flex items-baseline justify-between border-b border-border pb-3">
                    <h2 className="!text-xl !tracking-tight capitalize">
                      {status.replace("_", " ")}
                    </h2>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                      {list.length} {list.length === 1 ? "agenda" : "agendas"}
                    </div>
                  </div>
                  <ul className="space-y-5">
                    {list.map((a) => (
                      <li key={a.id}>
                        <Link
                          href={`/agendas/${a.slug}`}
                          className="group block rounded-sm border border-border bg-bg p-5 no-underline hover:border-heading"
                        >
                          <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em]">
                            <span className="text-muted">{categoryLabel(a.category)}</span>
                            <span className={"inline-flex items-center rounded-sm border px-1.5 py-0.5 " + statusTone(a.status)}>
                              {a.status.replace("_", " ")}
                            </span>
                            <span className={"inline-flex items-center rounded-sm border px-1.5 py-0.5 " + priorityTone(a.priority)}>
                              {a.priority} priority
                            </span>
                          </div>
                          <h3 className="text-base font-semibold text-heading group-hover:text-hover">
                            {a.title}
                          </h3>
                          {a.summary && (
                            <p className="mt-1.5 text-sm leading-relaxed text-muted line-clamp-3">
                              {a.summary}
                            </p>
                          )}
                          <div className="mt-3 flex items-center gap-3 text-[11px] text-muted">
                            <span>started {a.started_on}</span>
                            {a.target_resolution_on && (
                              <span>target {a.target_resolution_on}</span>
                            )}
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </StateShell>
  );
}
