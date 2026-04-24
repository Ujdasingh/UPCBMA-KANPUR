import { createClient } from "@/lib/supabase/server";
import { PublicShell } from "@/components/public/shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { submitContact } from "./actions";
import {
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Phone,
  Mail,
  Clock,
} from "lucide-react";

export const metadata = {
  title: "Contact — UPCBMA Kanpur Chapter",
  description:
    "Get in touch with the UPCBMA Kanpur Chapter — membership enquiries, lab bookings, advocacy, press.",
};

export const dynamic = "force-dynamic";

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { ok, error } = await searchParams;

  const supabase = await createClient();
  const { data: office } = await supabase
    .from("office_info")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  return (
    <PublicShell>
      <section className="border-b border-border bg-surface">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
            Contact
          </div>
          <h1 className="mt-3 !tracking-tight">Get in touch.</h1>
          <p className="mt-4 text-[15px] leading-relaxed text-muted">
            Membership enquiries, lab bookings, press, and general questions —
            the committee and chapter office read every message.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-14 px-6 py-14 md:grid-cols-[1fr_1.6fr]">
        {/* Office info */}
        <div className="space-y-8">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
              Chapter office
            </div>
            <h2 className="mt-2 !text-xl !tracking-tight">Where to find us</h2>
          </div>

          <ul className="space-y-5 text-sm">
            {office?.address && (
              <ContactItem
                Icon={MapPin}
                label="Address"
                content={<span className="whitespace-pre-line">{office.address}</span>}
              />
            )}
            {office?.phone && (
              <ContactItem
                Icon={Phone}
                label="Phone"
                content={
                  <a
                    href={`tel:${office.phone}`}
                    className="text-text no-underline hover:text-heading"
                  >
                    {office.phone}
                  </a>
                }
              />
            )}
            {office?.email && (
              <ContactItem
                Icon={Mail}
                label="Email"
                content={
                  <a
                    href={`mailto:${office.email}`}
                    className="text-text no-underline hover:text-heading"
                  >
                    {office.email}
                  </a>
                }
              />
            )}
            {office?.office_hours && (
              <ContactItem
                Icon={Clock}
                label="Office hours"
                content={office.office_hours}
              />
            )}
          </ul>

          {(office?.lab_phone || office?.lab_hours) && (
            <div className="rounded-sm border border-border bg-surface p-5">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                Lab desk
              </div>
              <div className="mt-1.5 text-sm font-semibold text-heading">
                For sample drop-off and test queries
              </div>
              <dl className="mt-3 space-y-2 text-sm">
                {office?.lab_phone && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted">Phone</dt>
                    <dd>
                      <a
                        href={`tel:${office.lab_phone}`}
                        className="text-text no-underline hover:text-heading"
                      >
                        {office.lab_phone}
                      </a>
                    </dd>
                  </div>
                )}
                {office?.lab_hours && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted">Hours</dt>
                    <dd className="text-text">{office.lab_hours}</dd>
                  </div>
                )}
                {office?.lab_contact_name && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted">Contact</dt>
                    <dd className="text-text">
                      {office.lab_contact_name}
                      {office.lab_contact_role && (
                        <span className="text-muted">
                          {" "}
                          — {office.lab_contact_role}
                        </span>
                      )}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {!office && (
            <p className="text-sm text-muted italic">
              Office contact details will be published soon.
            </p>
          )}
        </div>

        {/* Form */}
        <div>
          {ok === "1" && (
            <div className="mb-6 flex gap-3 rounded-sm border border-emerald-200 bg-emerald-50 p-4">
              <CheckCircle2
                className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700"
                strokeWidth={1.75}
              />
              <div>
                <div className="text-sm font-semibold text-emerald-900">
                  Message sent.
                </div>
                <div className="mt-1 text-sm text-emerald-900/80">
                  We&rsquo;ll get back to you shortly.
                </div>
              </div>
            </div>
          )}
          {error && (
            <div className="mb-6 flex gap-3 rounded-sm border border-red-200 bg-red-50 p-4">
              <AlertTriangle
                className="mt-0.5 h-5 w-5 shrink-0 text-red-700"
                strokeWidth={1.75}
              />
              <div className="text-sm text-red-900">{error}</div>
            </div>
          )}

          <Card>
            <form action={submitContact} className="space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Your name" htmlFor="name" required>
                  <Input id="name" name="name" required autoComplete="name" placeholder="Full name" />
                </Field>
                <Field label="Company (optional)" htmlFor="company">
                  <Input id="company" name="company" autoComplete="organization" placeholder="Company / firm" />
                </Field>
                <Field label="Email" htmlFor="email">
                  <Input id="email" name="email" type="email" autoComplete="email" placeholder="you@company.com" />
                </Field>
                <Field label="Phone" htmlFor="phone">
                  <Input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="+91 98xxx xxxxx" />
                </Field>
              </div>

              <Field label="Subject (optional)" htmlFor="subject">
                <Input id="subject" name="subject" placeholder="Short summary" />
              </Field>

              <Field label="Message" htmlFor="message" required>
                <textarea
                  id="message"
                  name="message"
                  rows={6}
                  required
                  className="w-full rounded-sm border border-border bg-bg px-3 py-2 text-sm focus-visible:border-heading focus-visible:outline-none"
                  placeholder="What can we help you with?"
                />
              </Field>

              <div className="flex items-center justify-between border-t border-border pt-5">
                <p className="text-xs text-muted">
                  Please provide at least an email or phone so we can reply.
                </p>
                <Button type="submit">Send message</Button>
              </div>
            </form>
          </Card>
        </div>
      </section>
    </PublicShell>
  );
}

function ContactItem({
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
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
          {label}
        </div>
        <div className="mt-0.5 text-text">{content}</div>
      </div>
    </li>
  );
}
