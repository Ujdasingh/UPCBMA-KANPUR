import Link from "next/link";
import { StateShell } from "@/components/public/state-shell";
import { Sparkles } from "lucide-react";

export const metadata = { title: "Coming soon — UPCBMA" };

export default function ComingSoonPage() {
  return (
    <StateShell>
      <section className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-6 py-20 text-center">
        <Sparkles className="h-8 w-8 text-muted" strokeWidth={1.5} />
        <h1 className="mt-6 !tracking-tight">Coming soon.</h1>
        <p className="mt-4 max-w-prose text-[15px] leading-relaxed text-muted">
          This destination isn&rsquo;t live yet. Our social-media presence
          and a few other channels are being set up — we&rsquo;ll have them
          ready shortly.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex h-10 items-center rounded-sm bg-heading px-4 text-sm font-medium text-white no-underline hover:bg-hover"
          >
            Back to home
          </Link>
          <Link
            href="/contact"
            className="inline-flex h-10 items-center rounded-sm border border-rule bg-bg px-4 text-sm font-medium text-heading no-underline hover:border-heading hover:bg-surface"
          >
            Contact us
          </Link>
        </div>
      </section>
    </StateShell>
  );
}
