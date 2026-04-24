import { PublicShell } from "@/components/public/shell";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "About — UPCBMA Kanpur Chapter",
  description:
    "About the Kanpur chapter of the Uttar Pradesh Corrugated Box Manufacturers' Association — mission, structure, and what we do for members.",
};

export const revalidate = 300;

export default async function AboutPage() {
  const supabase = await createClient();
  const { data: office } = await supabase
    .from("office_info")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  return (
    <PublicShell>
      {/* Header */}
      <section className="border-b border-border bg-surface">
        <div className="mx-auto max-w-3xl px-6 py-20">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
            About
          </div>
          <h1 className="mt-3 !tracking-tight">
            A regional chapter serving Kanpur&rsquo;s packaging industry.
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-muted">
            UPCBMA Kanpur is one of the regional chapters of the Uttar Pradesh
            Corrugated Box Manufacturers&rsquo; Association. We unite
            manufacturers in and around Kanpur, give them a collective voice,
            and provide shared services like testing, training, and advocacy.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="mx-auto max-w-3xl px-6 py-16">
        <h2 className="!tracking-tight">What we work on</h2>
        <div className="mt-6 space-y-5 text-[15px] leading-relaxed text-text">
          <p>
            The corrugated box industry is the invisible backbone of
            e-commerce, FMCG, pharma, and manufacturing across India. Kanpur,
            with its concentration of mid-sized board and box manufacturers,
            has been part of that story for decades. Our chapter exists to
            make sure that industry has a voice and the infrastructure to stay
            competitive.
          </p>
          <p>
            On any given month, the committee will be engaging with raw
            material suppliers on pricing trends, responding to GST and
            compliance circulars on behalf of members, coordinating training
            for shop-floor staff, and running the chapter&rsquo;s in-house
            testing lab. It&rsquo;s deliberately unglamorous work &mdash; but
            it&rsquo;s what keeps small and mid-sized members on a level
            playing field.
          </p>
        </div>

        {/* What we offer */}
        <div className="mt-14 grid gap-10 md:grid-cols-2">
          <Block
            label="Advocacy"
            title="Representation before state and central bodies"
            body="We write to regulators, submit industry positions on state policy consultations, and coordinate with the national UPCBMA body on issues affecting corrugated box manufacturers."
          />
          <Block
            label="Testing"
            title="An in-house lab for member quality control"
            body="Burst strength, bending, compression, cobb value, and paper GSM tests at member rates. Booking, sample tracking, and result delivery are handled through this site."
          />
          <Block
            label="Community"
            title="Regular meets, training, and knowledge-sharing"
            body="Quarterly member meets, an annual general meeting, skill training for operators and supervisors, and an active committee network — structured to keep members connected."
          />
          <Block
            label="Standards"
            title="A reference point for industry best practice"
            body="The chapter publishes guidance notes, circulates compliance updates, and helps members benchmark against peers on quality and operating metrics."
          />
        </div>
      </section>

      {/* Office / contact snapshot */}
      <section className="border-t border-border bg-surface">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 md:grid-cols-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
              Chapter office
            </div>
            <h2 className="mt-2 !text-xl !tracking-tight">
              Visit the office
            </h2>
            <p className="mt-3 text-sm text-muted">
              The chapter office is also where the lab desk accepts samples.
              Drop by during office hours or contact us to schedule a visit.
            </p>
          </div>

          <div className="md:col-span-2 grid gap-6 sm:grid-cols-2">
            <Fact label="Address" value={office?.address} />
            <Fact label="Phone" value={office?.phone} />
            <Fact label="Email" value={office?.email} />
            <Fact label="Office hours" value={office?.office_hours} />
          </div>
        </div>
      </section>
    </PublicShell>
  );
}

function Block({
  label,
  title,
  body,
}: {
  label: string;
  title: string;
  body: string;
}) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
        {label}
      </div>
      <h3 className="mt-2 text-lg font-semibold text-heading">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
    </div>
  );
}

function Fact({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
        {label}
      </div>
      <div className="mt-1 whitespace-pre-line text-sm text-text">
        {value ?? <span className="italic text-muted">Coming soon</span>}
      </div>
    </div>
  );
}
