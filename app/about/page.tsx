import Image from "next/image";
import Link from "next/link";
import { listActiveChapters } from "@/lib/chapter-loader";
import { getStateLogoUrl } from "@/lib/site-settings";
import { StateShell } from "@/components/public/state-shell";
import { CorrugatedWave } from "@/components/public/wave";

export const metadata = {
  title: "About",
  description:
    "About the Uttar Pradesh Corrugated Box Manufacturers' Association — state body serving regional chapters across UP.",
};

export const revalidate = 300;

export default async function AboutPage() {
  const [chapters, logoSrc] = await Promise.all([
    listActiveChapters(),
    getStateLogoUrl(),
  ]);

  return (
    <StateShell>
      <section className="border-b border-border bg-surface">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 sm:py-20 md:grid-cols-[1.2fr_1fr] md:items-center">
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
            {/* Tier-1 affiliation badge — mention FCBM here so the
                relationship is visible above the fold, then expand on it
                below with the dedicated affiliation card. */}
            <div className="mt-5 inline-flex items-center gap-2 rounded-sm border border-border bg-bg px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-heading">
              <span className="text-muted">Affiliated to</span>
              FCBM
            </div>
          </div>
          {/* Logo card — the About hero used to ride on an Unsplash stock
              photo that Unsplash had quietly reassigned to something off-
              topic. We now lean on the brand: the uploaded state logo,
              centered, sitting on a quiet surface with a small wordmark
              below. Falls back to /upcbma-logo.svg when getStateLogoUrl
              returns the bundled default, so this never goes blank. */}
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-sm border border-border bg-surface">
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-6 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoSrc}
                alt="UPCBMA logo"
                className="h-32 w-32 object-contain sm:h-40 sm:w-40 md:h-44 md:w-44"
              />
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
                  Uttar Pradesh
                </div>
                <div className="mt-1 text-sm font-semibold text-heading sm:text-base">
                  Corrugated Box Manufacturers&rsquo; Association
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="text-border">
          <CorrugatedWave className="h-5 w-full" />
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
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

      {/* FCBM affiliation card — sits between the "What we do" prose
          and the chapter directory, so the federation context is the
          first thing readers see after the value-prop paragraphs.
          The logo lives at /public/fcbm-logo.png. If the file isn't
          there yet, the card still reads fine; the <img> just shows
          its alt text. */}
      <section className="border-t border-border bg-bg">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
              Affiliated to
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/fcbm-logo.png"
              alt="Federation of Corrugated Box Manufacturers of India (FCBM)"
              className="h-24 w-auto max-w-xs object-contain sm:h-28 md:h-32"
            />
            <div>
              <h2 className="!text-2xl !tracking-tight">
                Federation of Corrugated Box Manufacturers of India
              </h2>
              <p className="mt-3 max-w-prose text-[15px] leading-relaxed text-muted">
                UPCBMA is a constituent state body of FCBM &mdash; the apex
                national federation that represents corrugated box
                manufacturers across India. Through FCBM, members access
                national-level advocacy, technical standards, and industry
                forums; UPCBMA delivers the on-the-ground state programs
                that connect the federation to local manufacturers.
              </p>
            </div>
            <a
              href="https://www.fcbm.org"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center gap-1.5 rounded-sm border border-heading bg-bg px-4 text-sm font-medium text-heading no-underline hover:bg-surface"
            >
              Visit fcbm.org &rarr;
            </a>
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16">
          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">Chapters</div>
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
