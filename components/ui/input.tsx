import { cn } from "@/lib/utils";
import * as React from "react";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type = "text", ...props }, ref) => (
  <input
    ref={ref}
    type={type}
    className={cn(
      "block w-full rounded-sm border border-rule bg-bg px-3 py-2 text-sm",
      "placeholder:text-muted focus:border-heading focus:outline-none",
      "disabled:cursor-not-allowed disabled:opacity-60",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, rows = 4, ...props }, ref) => (
  <textarea
    ref={ref}
    rows={rows}
    className={cn(
      "block w-full rounded-sm border border-rule bg-bg px-3 py-2 text-sm",
      "placeholder:text-muted focus:border-heading focus:outline-none",
      "disabled:cursor-not-allowed disabled:opacity-60 resize-y",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "block w-full rounded-sm border border-rule bg-bg px-3 py-2 text-sm",
      "focus:border-heading focus:outline-none",
      "disabled:cursor-not-allowed disabled:opacity-60",
      className,
    )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";
