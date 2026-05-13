import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthedMember } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { StateShell } from "@/components/public/state-shell";
import { Avatar } from "@/components/public/avatar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { updateMyProfile } from "./actions";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Quote,
} from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit profile — UPCBMA" };

export default async function EditMyProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { ok, error } = await searchParams;
  const me = await getAuthedMember();
  if (!me) redirect("/login?next=/me/profile");

  const svc = createServiceClient();
  const { data: row } = await svc
    .from("members")
    .select("name, phone, company, email, quote, photo_url")
    .eq("id", me.id)
    .maybeSingle();

  // Find any committee positions this member holds — useful context so they
  // know whether their photo + quote will go live publicly.
  const { data: appointments } = await svc
    .from("committee_appointments")
    .select(
      "area_name, term_start, term_end, role:committee_roles(name), chapter:chapters(name, slug)",
    )
    .eq("member_id", me.id)
    .eq("status", "active");

  return (
    <StateShell>
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <Link
          href="/me"
          className="inline-flex items-center text-xs font-medium text-muted no-underline hover:text-heading"
        >
          <ArrowLeft className="mr-1 h-3.5 w-3.5" strokeWidth={2} />
          Back to my account
        </Link>

        <div className="mt-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
            My profile
          </div>
          <h1 className="mt-2 !text-3xl !tracking-tight">
            Tell people who you are.
          </h1>
          <p className="mt-3 max-w-prose text-sm text-muted">
            Your name, photo, and quote here will appear automatically on the
            committee section of your chapter page if you hold a position. You
            control what shows up.
          </p>
        </div>

        {ok && (
          <div className="mt-6 flex gap-3 rounded-sm border border-emerald-200 bg-emerald-50 p-4">
            <CheckCircle2
              className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700"
              strokeWidth={1.75}
            />
            <div className="text-sm text-emerald-900">{ok}</div>
          </div>
        )}
        {error && (
          <div className="mt-6 flex gap-3 rounded-sm border border-red-200 bg-red-50 p-4">
            <AlertTriangle
              className="mt-0.5 h-5 w-5 shrink-0 text-red-700"
              strokeWidth={1.75}
            />
            <div className="text-sm text-red-900">{error}</div>
          </div>
        )}

        {appointments && appointments.length > 0 && (
          <div className="mt-6 rounded-sm border border-border bg-surface p-4 text-sm">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
              You currently hold
            </div>
            <ul className="mt-2 space-y-1.5">
              {appointments.map((a, i) => {
                const role = Array.isArray(a.role) ? a.role[0] : a.role;
                const ch = Array.isArray(a.chapter) ? a.chapter[0] : a.chapter;
                return (
                  <li key={i} className="flex items-baseline justify-between">
                    <span className="text-text">
                      <strong className="font-semibold text-heading">
                        {role?.name ?? "Position"}
                      </strong>
                      {a.area_name && <span className="text-muted"> · {a.area_name}</span>}
                    </span>
                    {ch && (
                      <Link
                        href={`/${ch.slug}#committee`}
                        className="text-xs text-muted no-underline hover:text-heading"
                      >
                        {ch.name} →
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="mt-8 grid gap-6 md:grid-cols-[1fr_2fr]">
          {/* Live preview */}
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
              Live preview
            </div>
            <div className="mt-3 rounded-sm border border-border bg-bg p-5">
              <div className="flex items-start gap-3">
                <Avatar
                  name={row?.name ?? me.name}
                  src={row?.photo_url ?? undefined}
                  size="md"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                    Committee member
                  </div>
                  <div className="mt-0.5 truncate text-base font-semibold text-heading">
                    {row?.name ?? me.name}
                  </div>
                  {row?.company && (
                    <div className="truncate text-sm text-muted">
                      {row.company}
                    </div>
                  )}
                </div>
              </div>
              {row?.quote && (
                <blockquote className="mt-4 flex gap-2 border-t border-border pt-4 text-xs leading-relaxed text-text italic">
                  <Quote
                    className="mt-0.5 h-3 w-3 shrink-0 text-muted"
                    strokeWidth={2}
                  />
                  {row.quote}
                </blockquote>
              )}
            </div>
          </div>

          {/* Edit form */}
          <Card>
            <form action={updateMyProfile} className="space-y-5">
              <Field label="Name" htmlFor="p_name" required>
                <Input
                  id="p_name"
                  name="name"
                  required
                  defaultValue={row?.name ?? me.name}
                  autoComplete="name"
                />
              </Field>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Phone" htmlFor="p_phone">
                  <Input
                    id="p_phone"
                    name="phone"
                    type="tel"
                    defaultValue={row?.phone ?? ""}
                    autoComplete="tel"
                  />
                </Field>
                <Field label="Company" htmlFor="p_company">
                  <Input
                    id="p_company"
                    name="company"
                    defaultValue={row?.company ?? ""}
                    autoComplete="organization"
                    placeholder="Your firm"
                  />
                </Field>
              </div>

              <ImageUploadField
                name="photo_url"
                defaultValue={row?.photo_url ?? ""}
                folder="chapters"
                label="Profile photo"
                hint="Square crops look best — head & shoulders. Up to 6 MB."
                aspect="1/1"
              />

              <Field
                label="Short quote (optional)"
                htmlFor="p_quote"
                hint="One line — what you want people to know about your role or your work. Up to 240 characters."
              >
                <textarea
                  id="p_quote"
                  name="quote"
                  rows={3}
                  maxLength={240}
                  defaultValue={row?.quote ?? ""}
                  className="w-full rounded-sm border border-border bg-bg px-3 py-2 text-sm focus-visible:border-heading focus-visible:outline-none"
                  placeholder="e.g. Helping Kanpur's small mills navigate compliance for a fair playing field."
                />
              </Field>

              <div className="flex justify-end border-t border-border pt-4">
                <Button type="submit">Save profile</Button>
              </div>
            </form>
          </Card>
        </div>
      </main>
    </StateShell>
  );
}
