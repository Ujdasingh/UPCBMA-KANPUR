"use client";

import { cn } from "@/lib/utils";
import * as React from "react";

/**
 * Dialog built on the native <dialog> element. No Radix dependency.
 * Usage:
 *   <Dialog open={open} onOpenChange={setOpen} title="New appointment">
 *     <form>...</form>
 *   </Dialog>
 */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const ref = React.useRef<HTMLDialogElement>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={() => onOpenChange(false)}
      onClick={(e) => {
        // Close when clicking the backdrop (outside the dialog content).
        if (e.target === e.currentTarget) onOpenChange(false);
      }}
      className={cn(
        "m-auto w-full max-w-lg rounded-sm border border-rule bg-bg p-0",
        "backdrop:bg-black/30 backdrop:backdrop-blur-[2px]",
        className,
      )}
    >
      <div className="border-b border-border px-6 py-4">
        <h2 className="text-base font-semibold">{title}</h2>
        {description && (
          <p className="mt-1 text-xs text-muted">{description}</p>
        )}
      </div>
      <div className="px-6 py-5">{children}</div>
    </dialog>
  );
}
