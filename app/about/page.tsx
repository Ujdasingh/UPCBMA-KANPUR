import Image from "next/image";
import Link from "next/link";
import { listActiveChapters } from "@/lib/chapter-loader";
import { StateShell } from "@/components/public/state-shell";
import { CorrugatedWave } from "@/components/public/wave";

export const metadata = {
  title: "About — UPCBMA",
  description:
    "About the Uttar Pradesh Corrugated Box Manufacturers' Association — state body serving regional chapters across UP.",
};

export const revalidate = 300;

export default async function AboutPage() {
  const chapters = await listActiveChapters();

  return (
    <StateShell>
      <section className="border-b border-border bg-surface">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-20 md:grid-cols-[1.2fr_1fr] md:items-center">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">About</div>
            <h1 className="mt-3 !tracking-tight">
              The state body for UP&rsquo;s corrugated box industry.
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-muted">
              UPCBMA unites corrugated box manufacturers across Uttar Pradesh
              under a common umbrella, with regional chapters serving
              manufacturers in their own cities. The state body coordinates
              advocacy, standards, and statewide training; chapters operate
              local committees, labs, and member programs.
            </p>
          </div>
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-sm border border-border bg-stone-200">
            <Image
              src="https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?auto=format&fit=crop&w=800&q=70"
              alt="Corrugated cardboard"
              fill
              sizes="(min-width: 768px) 40vw, 100vw"
              className="object-cover"
            />
          </div>
        </div>
        <div className="text-border">
          <CorrugatedWave className="h-5 w-full" />
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-16">
        <h2 className="!tracking-tight">What we do</h2>
        <div className="mt-6 space-y-5 text-[15px] leading-relaxed text-text">
          <p>
            Corrugated packaging is the invisible backbone of e-commerce,
            FMCG, pharma, and manufacturing. UP&rsquo;s network of
            mid-sized converters and mills is part of that story.
            UPCBMA exists to give this industry a collective voice.
          </p>
          <p>
            On any given month the secretariat is engaging suppliers on
            pricing trends, responding to GST and compliance circulars on
            behalf of members, coordinating training, and supporting chapter
            labs. Chapters handle local operations; the state body handles
            the connective tissue.
          </p>
        </div>
      </section>

      <section className="border-t border-border bg-surface">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">Chapters</div>
              <h2 className="mt-2 !text-2xl !tracking-tight">
                {chapters.length} active chapter{chapters.length === 1 ? "" : "s"} across UP
              </h2>
            </div>
            <Link href="/chapters" className="text-sm font-medium text-heading no-underline hover:text-hover">
              Directory &rarr;
            </Link>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {chapters.map((c) => (
              <Link key={c.id} href={`/${c.slug}`} className="rounded-sm border border-border bg-bg px-4 py-3 text-sm no-underline hover:border-heading">
                <span className="font-medium text-heading">{c.name}</span>
                <span className="ml-2 text-muted">{c.city}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </StateShell>
  );
}
