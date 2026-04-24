"use client";

import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import * as React from "react";
import { useFormStatus } from "react-dom";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variantClass: Record<Variant, string> = {
  primary:
    "bg-heading text-white hover:bg-hover focus-visible:outline-heading",
  secondary:
    "bg-bg text-heading border border-rule hover:border-heading hover:bg-surface",
  ghost:
    "bg-transparent text-heading hover:bg-surface border border-transparent",
  danger: "bg-danger text-white hover:bg-red-800",
};

const sizeClass: Record<Size, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-5 text-base",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Force the loading state externally (for non-form async handlers). */
  loading?: boolean;
}

/**
 * Primary button.
 *
 * When placed inside a `<form action={serverAction}>` with type="submit", the
 * button automatically:
 *   • shows a small spinner,
 *   • disables itself while the server action is in-flight,
 * so users get immediate feedback and can't double-submit.
 *
 * For async handlers that don't use a form action (e.g. onClick with a
 * useTransition), pass `loading` explicitly.
 *
 * Visual feedback on press: `active:scale-[0.98]` gives a subtle tactile
 * "push" that reads well on both mouse and touch.
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      className,
      children,
      type = "button",
      disabled,
      loading,
      ...props
    },
    ref,
  ) => {
    // useFormStatus has a meaningful `pending` value only when this button is
    // inside a <form> currently submitting via its action={...} prop.
    // Outside of a form it safely returns { pending: false }.
    const { pending } = useFormStatus();
    const showSpinner = (type === "submit" && pending) || loading === true;
    const isDisabled = disabled || showSpinner;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-busy={showSpinner}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-sm font-medium",
          "transition-[transform,background-color,border-color,color,opacity] duration-100 ease-out",
          "active:scale-[0.98]",
          "disabled:pointer-events-none disabled:opacity-60",
          variantClass[variant],
          sizeClass[size],
          className,
        )}
        {...props}
      >
        {showSpinner && (
          <Loader2
            className="h-3.5 w-3.5 animate-spin"
            strokeWidth={2.25}
            aria-hidden="true"
          />
        )}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";
