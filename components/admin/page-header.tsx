import * as React from "react";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="mb-8 flex items-start justify-between gap-4 border-b border-border pb-6">
      <div>
        <h1 className="!text-2xl !tracking-tight">{title}</h1>
        {description && (
          <p className="mt-1.5 text-sm text-muted">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
