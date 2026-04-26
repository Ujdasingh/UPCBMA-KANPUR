"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Logo } from "./logo";
import { signIn } from "@/app/login/actions";
import { LogIn } from "lucide-react";

/**
 * In-place sign-in: rendered as a button that opens a modal with the auth
 * form. Used in both state and chapter navs so visitors don't have to
 * leave the page to sign in.
 *
 * Falls back to /login (the standalone page) on direct URL access — Supabase
 * cookies handle the session either way.
 */
export function LoginButton({
  className,
  variant = "outline",
  label = "Sign in",
}: {
  className?: string;
  variant?: "outline" | "ghost";
  label?: string;
}) {
  const [open, setOpen] = useState(false);

  const buttonClass =
    variant === "outline"
      ? "inline-flex h-9 items-center gap-1.5 rounded-sm border border-border px-3 text-sm font-medium text-heading transition-all duration-100 active:scale-[0.98] hover:border-heading hover:bg-surface"
      : "inline-flex items-center gap-1 text-muted hover:text-heading transition-colors";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={(className ? className + " " : "") + buttonClass}
      >
        <LogIn className={variant === "outline" ? "h-3.5 w-3.5" : "h-3 w-3"} strokeWidth={2} />
        {label}
      </button>

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Sign in"
        description="Access your UPCBMA dashboard."
      >
        <div className="mb-4 flex justify-center">
          <Logo size={40} />
        </div>
        <form action={signIn} className="space-y-4">
          <input type="hidden" name="next" value="/admin" />
          <Field label="Login email" htmlFor="login_email" required>
            <Input
              id="login_email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="your login email"
              autoFocus
            />
          </Field>
          <Field label="Password" htmlFor="login_password" required>
            <Input
              id="login_password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="your password"
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="w-32">Sign in</Button>
          </div>
        </form>
        <p className="mt-4 text-center text-xs text-muted">
          Forgot your password? Contact your chapter admin to reset.
        </p>
      </Dialog>
    </>
  );
}
