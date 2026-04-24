import { cn } from "@/lib/utils";
import * as React from "react";

/**
 * A labelled form field with optional hint and error text.
 * Wrap any of the Input/Textarea/Select components.
 */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className="block text-xs font-semibold uppercase tracking-[0.12em] text-muted"
      >
        {label}
        {required && <span className="ml-1 text-danger">*</span>}
      </label>
      {children}
      {hint && !error && (
        <p className="text-xs text-muted">{hint}</p>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
