import { cn } from "@/lib/utils";
import * as React from "react";

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
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-sm font-medium",
        "transition-colors disabled:pointer-events-none disabled:opacity-50",
        variantClass[variant],
        sizeClass[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";
