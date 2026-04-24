import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { signIn } from "./actions";

export const metadata = {
  title: "Sign in — UPCBMA Kanpur Admin",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  return (
    <main className="grid min-h-screen place-items-center bg-surface px-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
            UPCBMA Kanpur Chapter
          </div>
          <h1 className="mt-2 !text-2xl">Admin sign in</h1>
          <p className="mt-1 text-sm text-muted">
            Authorised committee members only.
          </p>
        </div>

        <Card>
          <form action={signIn} className="space-y-5">
            <input type="hidden" name="next" value={next ?? "/admin"} />

            <Field label="Email" htmlFor="email" required>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@upcbmakanpur.in"
              />
            </Field>

            <Field label="Password" htmlFor="password" required>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
              />
            </Field>

            {error && (
              <p className="rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                {decodeURIComponent(error)}
              </p>
            )}

            <Button type="submit" className="w-full">
              Sign in
            </Button>
          </form>
        </Card>

        <p className="mt-6 text-center text-xs text-muted">
          Forgot your password? Contact the General Secretary to reset.
        </p>
      </div>
    </main>
  );
}
