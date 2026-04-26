import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { getChapterBySlug, RESERVED_SLUGS } from "@/lib/chapter-loader";
import { ChapterShell } from "@/components/public/chapter-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { submitChapterContact } from "./actions";
import { CheckCircle2, AlertTriangle, MapPin, Phone, Mail, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (RESERVED_SLUGS.has(slug)) return {};
  const chapter = await getChapterBySlug(slug);
  return chapter ? { title: `Contact — ${chapter.name}` } : {};
}

export default async function ChapterContact({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { slug } = await params;
  const { ok, error } = await searchParams;
  if (RESERVED_SLUGS.has(slug)) notFound();
  const chapter = await getChapterBySlug(slug);
  if (!chapter) notFound();

  const svc = createServiceClient();
  const { data: office } = await svc
    .from("office_info")
    .select("*")
    .eq("chapter_id", chapter.id)
    .maybeSingle();

  return (
    <ChapterShell chapter={chapter}>
      <section className="border-b border-border bg-surface">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">Contact</div>
          <h1 className="mt-3 !tracking-tight">Contact {chapter.name}.</h1>
          <p className="mt-4 text-[15px] leading-relaxed text-muted">
            Membership enquiries, lab bookings, press, and general questions.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-14 px-6 py-14 md:grid-cols-[1fr_1.6fr]">
        <div className="space-y-8">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">Chapter office</div>
            <h2 className="mt-2 !text-xl !tracking-tight">Where to find us</h2>
          </div>
          <ul className="space-y-5 text-sm">
            {office?.address && <Item Icon={MapPin} label="Address" content={<span className="whitespace-pre-line">{office.address}</span>} />}
            {office?.phone && <Item Icon={Phone} label="Phone" content={<a href={`tel:${office.phone}`} className="text-text no-underline hover:text-heading">{office.phone}</a>} />}
            {office?.email && <Item Icon={Mail} label="Email" content={<a href={`mailto:${office.email}`} className="text-text no-underline hover:text-heading">{office.email}</a>} />}
            {office?.hours && <Item Icon={Clock} label="Office hours" content={office.hours} />}
          </ul>
          {!office && (
            <p className="text-sm italic text-muted">Office details to be published.</p>
          )}
        </div>

        <div>
          {ok === "1" && (
            <div className="mb-6 flex gap-3 rounded-sm border border-emerald-200 bg-emerald-50 p-4">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" strokeWidth={1.75} />
              <div>
                <div className="text-sm font-semibold text-emerald-900">Message sent.</div>
                <div className="mt-1 text-sm text-emerald-900/80">We&rsquo;ll get back to you shortly.</div>
              </div>
            </div>
          )}
          {error && (
            <div className="mb-6 flex gap-3 rounded-sm border border-red-200 bg-red-50 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" strokeWidth={1.75} />
              <div className="text-sm text-red-900">{error}</div>
            </div>
          )}
          <Card>
            <form action={submitChapterContact} className="space-y-5">
              <input type="hidden" name="chapter_slug" value={chapter.slug} />
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Your name" htmlFor="name" required>
                  <Input id="name" name="name" required autoComplete="name" placeholder="Full name" />
                </Field>
                <Field label="Company (optional)" htmlFor="company">
                  <Input id="company" name="company" autoComplete="organization" />
                </Field>
                <Field label="Email" htmlFor="email">
                  <Input id="email" name="email" type="email" autoComplete="email" />
                </Field>
                <Field label="Phone" htmlFor="phone">
                  <Input id="phone" name="phone" type="tel" autoComplete="tel" />
                </Field>
              </div>
              <Field label="Subject (optional)" htmlFor="subject">
                <Input id="subject" name="subject" />
              </Field>
              <Field label="Message" htmlFor="message" required>
                <textarea id="message" name="message" rows={6} required className="w-full rounded-sm border border-border bg-bg px-3 py-2 text-sm focus-visible:border-heading focus-visible:outline-none" />
              </Field>
              <div className="flex items-center justify-between border-t border-border pt-5">
                <p className="text-xs text-muted">Provide at least an email or phone.</p>
                <Button type="submit">Send message</Button>
              </div>
            </form>
          </Card>
        </div>
      </section>
    </ChapterShell>
  );
}

function Item({
  Icon,
  label,
  content,
}: {
  Icon: typeof MapPin;
  label: string;
  content: React.ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">{label}</div>
        <div className="mt-0.5 text-text">{content}</div>
      </div>
    </li>
  );
}
