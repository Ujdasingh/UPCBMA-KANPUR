import Link from "next/link";
import { listActiveChapters } from "@/lib/chapter-loader";
import { StateShell } from "@/components/public/state-shell";
import { ArrowRight, MapPin, Building2 } from "lucide-react";

export const revalidate = 300;
export const metadata = {
  title: "Chapters — UPCBMA",
  description: "All UPCBMA chapters across Uttar Pradesh.",
};

export default async function ChaptersDirectory() {
  const chapters = await listActiveChapters();

  return (
    <StateShell>
      <section className="border-b border-border bg-surface">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">Chapters</div>
          <h1 className="mt-3 !tracking-tight">Find your chapter.</h1>
          <p className="mt-5 text-lg leading-relaxed text-muted">
            UPCBMA has {chapters.length} active chapter{chapters.length === 1 ? "" : "s"} across
            Uttar Pradesh. Each one runs its own committee, lab, and member
            programs. Pick yours.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        {chapters.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Building2 className="h-8 w-8 text-muted" strokeWidth={1.5} />
            <p className="mt-3 max-w-md text-sm text-muted">
              No active chapters yet.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {chapters.map((c) => (
              <Link
                key={c.id}
                href={`/${c.slug}`}
                className="group rounded-sm border border-border bg-bg p-6 no-underline hover:border-heading"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                      {c.state}
                    </div>
                    <div className="mt-1 text-lg font-semibold text-heading group-hover:text-hover">
                      {c.name}
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-xs text-muted">
                      <MapPin className="h-3 w-3" strokeWidth={2} />
                      {c.city}
                    </div>
                  </div>
                  <ArrowRight
                    className="h-4 w-4 text-muted group-hover:text-heading transition-transform group-hover:translate-x-0.5"
                    strokeWidth={2}
                  />
                </div>
                {c.established_on && (
                  <div className="mt-4 border-t border-border pt-3 text-xs text-muted">
                    Since {new Date(c.established_on).getFullYear()}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>
    </StateShell>
  );
}
