import { StateShell } from "@/components/public/state-shell";

export const metadata = { title: "Terms & conditions — UPCBMA" };

export default function TermsPage() {
  return (
    <StateShell>
      <article className="mx-auto max-w-3xl px-6 py-12 text-[15px] leading-relaxed text-text">
        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">Legal</div>
        <h1 className="mt-3 !tracking-tight">Terms &amp; conditions</h1>
        <p className="mt-2 text-xs text-muted">
          Last updated: {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
        </p>

        <section className="mt-8 space-y-5">
          <h2 className="!text-xl !tracking-tight">Acceptance</h2>
          <p>
            By accessing upcbma.com you agree to abide by these terms. If
            you don&rsquo;t agree, please discontinue use of the site.
          </p>

          <h2 className="!text-xl !tracking-tight">Membership</h2>
          <p>
            Membership in UPCBMA is granted by the relevant chapter at its
            discretion. Submitting a membership request via the Join form
            does not by itself create membership; the chapter must review
            and confirm. Members are bound by the constitution of their
            chapter and of UPCBMA.
          </p>

          <h2 className="!text-xl !tracking-tight">Permitted use</h2>
          <p>
            Content on the site is for the personal and professional use of
            members and the wider corrugated-box industry. You may not
            scrape, redistribute, or commercialise the content without
            written permission from UPCBMA.
          </p>

          <h2 className="!text-xl !tracking-tight">Member-submitted content</h2>
          <p>
            By submitting an agenda proposal, comment, or any other
            user-generated content, you grant UPCBMA a non-exclusive,
            royalty-free licence to publish, edit, moderate, or remove that
            content as it sees fit. You are responsible for the accuracy
            and lawfulness of what you post; defamatory, abusive, or
            commercial-spam content will be removed.
          </p>

          <h2 className="!text-xl !tracking-tight">Lab services</h2>
          <p>
            Lab tests booked via the site are governed by the rate card and
            terms published by the chapter operating that lab at the time
            of booking. Test reports are issued on the chapter&rsquo;s own
            stationery and are the authoritative record of any test result.
          </p>

          <h2 className="!text-xl !tracking-tight">Account security</h2>
          <p>
            If you have a login on this site, you are responsible for
            keeping your credentials safe. Notify the chapter immediately if
            you suspect unauthorised use of your account.
          </p>

          <h2 className="!text-xl !tracking-tight">Changes</h2>
          <p>
            We may update these terms from time to time. Continued use of
            the site after changes are posted constitutes acceptance of the
            updated terms.
          </p>

          <h2 className="!text-xl !tracking-tight">Governing law</h2>
          <p>
            These terms are governed by the laws of India and the courts of
            the relevant district where the chapter is registered.
          </p>
        </section>
      </article>
    </StateShell>
  );
}
