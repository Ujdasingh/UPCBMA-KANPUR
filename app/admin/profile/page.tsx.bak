import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getAuthedAdmin } from "@/lib/auth";
import { AlertTriangle, CheckCircle2, KeyRound, Mail } from "lucide-react";
import { updateMyProfile } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your profile — UPCBMA Admin" };

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { ok, error } = await searchParams;

  const me = await getAuthedAdmin();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Read the fully-hydrated member row so we can pre-fill phone/company.
  const svc = createServiceClient();
  const { data: full } = await svc
    .from("members")
    .select("id, name, email, phone, company, role, category, member_since")
    .eq("id", me.id)
    .maybeSingle();

  const loginEmail = user?.email ?? "—";
  const contactEmail = full?.email ?? "";
  const emailsMatch = loginEmail === contactEmail;

  return (
    <>
      <PageHeader
        title="Your profile"
        description="Your personal contact details. Newsletters, password resets, and site notifications go to the email below — not to the login identifier."
      />

      {ok === "1" && (
        <div className="mb-6 flex gap-3 rounded-sm border border-emerald-200 bg-emerald-50 p-4">
          <CheckCircle2
            className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700"
            strokeWidth={1.75}
          />
          <div className="text-sm text-emerald-900">
            <div className="font-semibold">Profile updated.</div>
            <div className="mt-0.5 text-emerald-900/80">
              New details are live across the admin.
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

      <div className="grid gap-6 md:grid-cols-[1.4fr_1fr]">
        {/* Editable fields */}
        <Card>
          <div className="mb-4">
            <h2 className="text-base font-semibold text-heading">
              Personal details
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              Anyone receiving communication from the chapter as you will see
              this information.
            </p>
          </div>

          <form action={updateMyProfile} className="space-y-5">
            <Field label="Name" htmlFor="name" required>
              <Input
                id="name"
                name="name"
                required
                defaultValue={full?.name ?? ""}
              />
            </Field>

            <Field
              label="Contact email"
              htmlFor="email"
              required
              hint="Your real inbox — where newsletters and site notifications go. Different from your login email."
            >
              <Input
                id="email"
                name="email"
                type="email"
                required
                defaultValue={contactEmail}
                placeholder="you@gmail.com"
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Phone" htmlFor="phone">
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  defaultValue={full?.phone ?? ""}
                  placeholder="+91 98xxx xxxxx"
                />
              </Field>
              <Field label="Company" htmlFor="company">
                <Input
                  id="company"
                  name="company"
                  defaultValue={full?.company ?? ""}
                />
              </Field>
            </div>

            <div className="flex justify-end border-t border-border pt-5">
              <Button type="submit">Save changes</Button>
            </div>
          </form>
        </Card>

        {/* Read-only identity */}
        <div className="space-y-4">
          <Card>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
              <KeyRound className="h-3.5 w-3.5" strokeWidth={1.75} />
              Login identity
            </div>
            <div className="mt-3">
              <div className="text-xs text-muted">Login email</div>
              <div className="mt-0.5 break-all font-mono text-sm text-heading">
                {loginEmail}
              </div>
            </div>
            <div className="mt-3">
              <div className="text-xs text-muted">Role</div>
              <div className="mt-1">
                <Badge
                  tone={
                    full?.role === "super_admin"
                      ? "danger"
                      : full?.role === "admin"
                      ? "warn"
                      : "neutral"
                  }
                >
                  {full?.role ?? me.role}
                </Badge>
              </div>
            </div>
            <div className="mt-3">
              <div className="text-xs text-muted">Member ID</div>
              <div className="mt-0.5 font-mono text-xs text-text">{me.id}</div>
            </div>

            <p className="mt-5 rounded-sm border border-border bg-surface p-3 text-xs leading-relaxed text-muted">
              The login email is a fixed identifier you use at{" "}
              <code className="font-mono text-[11px]">/login</code>. It
              doesn&rsquo;t need to be a real inbox. To change it, ask a
              super_admin &mdash; they can update it from Supabase auth.
            </p>
          </Card>

          {emailsMatch && (
            <Card className="border-amber-200 bg-amber-50">
              <div className="flex gap-3">
                <Mail
                  className="mt-0.5 h-5 w-5 shrink-0 text-amber-700"
                  strokeWidth={1.75}
                />
                <div className="text-sm">
                  <div className="font-semibold text-amber-900">
                    Your contact email matches your login email.
                  </div>
                  <div className="mt-1 text-amber-900/80">
                    That&rsquo;s fine for now, but if{" "}
                    <span className="font-mono text-xs">{loginEmail}</span> is
                    not an inbox you actually check, update the contact email
                    to your real personal address so you receive
                    communications.
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
