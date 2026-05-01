import { redirect } from "next/navigation";
import { getAuthedMember } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { StateShell } from "@/components/public/state-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { changeMyPassword } from "./actions";
import { AlertTriangle, KeyRound, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Change password" };

export default async function ChangePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; first?: string }>;
}) {
  const { error, first } = await searchParams;

  const me = await getAuthedMember();
  if (!me) redirect("/login?next=/me/change-password");

  // Detect "first time" (must_change_password=true) so we can adjust the copy.
  const svc = createServiceClient();
  const { data: row } = await svc
    .from("members")
    .select("must_change_password")
    .eq("id", me.id)
    .maybeSingle();
  const isForced = row?.must_change_password === true || first === "1";

  return (
    <StateShell>
      <main className="mx-auto max-w-md px-4 py-9 sm:px-6 sm:py-14 lg:px-8">
        <div className="mb-6 flex items-center gap-3">
          <KeyRound
            className="h-6 w-6 text-heading"
            strokeWidth={1.75}
            aria-hidden="true"
          />
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
              Account security
            </div>
            <h1 className="mt-1 !text-2xl !tracking-tight">
              {isForced ? "Set your password" : "Change your password"}
            </h1>
          </div>
        </div>

        {isForced && (
          <div className="mb-6 flex gap-3 rounded-sm border border-amber-200 bg-amber-50 p-4">
            <ShieldCheck
              className="mt-0.5 h-5 w-5 shrink-0 text-amber-700"
              strokeWidth={1.75}
            />
            <div className="text-sm text-amber-900">
              <div className="font-semibold">First-time sign-in.</div>
              <div className="mt-0.5">
                You signed in with the temporary password from your invite. Pick
                a real password now — you&rsquo;ll use it from here on.
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
          <form action={changeMyPassword} className="space-y-5">
            <Field
              label="New password"
              htmlFor="new_password"
              hint="At least 8 characters. Mix letters and numbers."
              required
            >
              <Input
                id="new_password"
                name="new_password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                autoFocus
              />
            </Field>

            <Field
              label="Confirm new password"
              htmlFor="confirm_password"
              required
            >
              <Input
                id="confirm_password"
                name="confirm_password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </Field>

            <div className="flex justify-end border-t border-border pt-4">
              <Button type="submit">Save password</Button>
            </div>
          </form>
        </Card>

        <p className="mt-6 text-center text-xs text-muted">
          Tip: a passphrase like <code>kanpur-board-2026</code> is easier to
          remember than a random string and just as secure.
        </p>
      </main>
    </StateShell>
  );
}
