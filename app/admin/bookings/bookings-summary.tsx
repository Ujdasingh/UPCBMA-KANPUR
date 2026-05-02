"use client";

import { Download, Printer } from "lucide-react";
import type { Booking } from "@/lib/db-types";

/**
 * Header strip for the bookings page: status breakdown + 14-day chart +
 * CSV/print buttons. All client-side: no extra deps, no API roundtrips.
 *
 *  - Counts are derived from the same `rows` the table is rendering, so
 *    they stay in sync with whatever filter the page applied at fetch.
 *  - The chart is a hand-rolled inline SVG (no recharts/Chart.js) — keeps
 *    the bundle lean.
 *  - "Export to Excel" emits a CSV blob with a UTF-8 BOM so Excel opens
 *    it cleanly without a column dialog.
 *  - "Save as PDF" calls `window.print()` against a print stylesheet
 *    declared in the page; the user picks 'Save as PDF' from the
 *    browser print dialog.
 */
export function BookingsSummary({
  rows,
  chapterName,
}: {
  rows: Booking[];
  chapterName: string;
}) {
  const total = rows.length;
  const counts = countByStatus(rows);
  const buckets = bucketByDay(rows, 14);

  return (
    <section
      aria-label="Bookings overview"
      className="bookings-summary mb-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]"
    >
      <div className="rounded-sm border border-border bg-bg p-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
          Status breakdown
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2">
          <Stat label="Total" value={total} tone="neutral" />
          <Stat label="Pending" value={counts.pending} tone="warn" />
          <Stat label="Confirmed" value={counts.confirmed} tone="info" />
          <Stat label="In progress" value={counts.in_progress} tone="info" />
          <Stat label="Completed" value={counts.completed} tone="success" />
          <Stat label="Cancelled" value={counts.cancelled} tone="muted" />
        </div>
        <div className="no-print mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
          <button
            type="button"
            onClick={() => downloadCsv(rows, chapterName)}
            disabled={rows.length === 0}
            className="inline-flex h-9 items-center gap-1.5 rounded-sm border border-border bg-bg px-3 text-xs font-medium text-heading transition-colors hover:border-heading disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" strokeWidth={2} />
            Export to Excel (.csv)
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            disabled={rows.length === 0}
            className="inline-flex h-9 items-center gap-1.5 rounded-sm border border-border bg-bg px-3 text-xs font-medium text-heading transition-colors hover:border-heading disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Printer className="h-3.5 w-3.5" strokeWidth={2} />
            Save as PDF / Print
          </button>
        </div>
      </div>

      <div className="rounded-sm border border-border bg-bg p-4">
        <div className="flex items-baseline justify-between">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
            Last 14 days
          </div>
          <div className="text-[11px] text-muted">
            By submission date
          </div>
        </div>
        <Chart buckets={buckets} />
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "info" | "warn" | "success" | "neutral" | "muted";
}) {
  const dot =
    tone === "warn"
      ? "bg-amber-500"
      : tone === "info"
        ? "bg-blue-500"
        : tone === "success"
          ? "bg-emerald-500"
          : tone === "muted"
            ? "bg-slate-300"
            : "bg-slate-700";
  return (
    <div className="rounded-sm border border-border bg-surface px-3 py-2">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
        <span className={`inline-block h-2 w-2 rounded-full ${dot}`} />
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-heading">
        {value}
      </div>
    </div>
  );
}

function Chart({
  buckets,
}: {
  buckets: { label: string; date: string; count: number }[];
}) {
  const max = Math.max(1, ...buckets.map((b) => b.count));
  const width = 100; // viewBox units — scales to container
  const height = 40;
  const barW = width / buckets.length;
  return (
    <div className="mt-3">
      <svg
        viewBox={`0 0 ${width} ${height + 14}`}
        preserveAspectRatio="none"
        className="h-32 w-full"
        role="img"
        aria-label={`Bookings per day for the last ${buckets.length} days`}
      >
        {buckets.map((b, i) => {
          const h = (b.count / max) * height;
          return (
            <g key={b.date} transform={`translate(${i * barW},0)`}>
              <rect
                x={barW * 0.18}
                y={height - h}
                width={barW * 0.64}
                height={h}
                rx={0.6}
                className="fill-current text-heading"
                opacity={b.count > 0 ? 0.85 : 0.18}
              >
                <title>
                  {b.date}: {b.count} booking{b.count === 1 ? "" : "s"}
                </title>
              </rect>
            </g>
          );
        })}
        {buckets.map((b, i) => {
          // Only label every other tick on small screens to avoid overlap.
          const showLabel = i === 0 || i === buckets.length - 1 || i % 3 === 0;
          if (!showLabel) return null;
          return (
            <text
              key={b.date + "-l"}
              x={i * barW + barW / 2}
              y={height + 10}
              fontSize={3.4}
              textAnchor="middle"
              className="fill-muted"
            >
              {b.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Pure helpers
// ─────────────────────────────────────────────────────────────────────

function countByStatus(rows: Booking[]) {
  const c = {
    pending: 0,
    confirmed: 0,
    in_progress: 0,
    completed: 0,
    cancelled: 0,
  };
  for (const r of rows) {
    if (r.status in c) c[r.status as keyof typeof c]++;
  }
  return c;
}

function bucketByDay(rows: Booking[], days: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const out: { label: string; date: string; count: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
    });
    out.push({ label, date: iso, count: 0 });
  }
  const index = new Map(out.map((b, i) => [b.date, i]));
  for (const r of rows) {
    const submitted = (r.submitted_at ?? "").slice(0, 10);
    const i = index.get(submitted);
    if (i !== undefined) out[i]!.count++;
  }
  return out;
}

function downloadCsv(rows: Booking[], chapterName: string) {
  const headers = [
    "Submitted",
    "Status",
    "Member",
    "Company",
    "Tests",
    "Sample count",
    "Preferred date",
    "Time slot",
    "Notes",
  ];
  const lines = [headers.map(csvCell).join(",")];
  for (const r of rows) {
    const tests = Array.isArray(r.tests)
      ? r.tests.join(" / ")
      : String(r.tests ?? "");
    const time =
      // The migration adds preferred_time as a real column; until it lands,
      // the value lives inside `notes` after "Time:".
      // Cast through unknown so TS doesn't complain about the optional field.
      ((r as unknown as { preferred_time?: string }).preferred_time ?? "") ||
      extractTimeFromNotes(r.notes ?? "");
    lines.push(
      [
        r.submitted_at ?? "",
        r.status ?? "",
        r.member_name ?? "",
        r.member_company ?? "",
        tests,
        r.sample_count ?? "",
        r.preferred_date ?? "",
        time,
        r.notes ?? "",
      ]
        .map((v) => csvCell(String(v)))
        .join(","),
    );
  }
  const csv = "﻿" + lines.join("\r\n"); // BOM helps Excel pick UTF-8.
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slug(chapterName)}-bookings-${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function extractTimeFromNotes(notes: string): string {
  const m = notes.match(/Time:\s*([^\n|]+?)(?:\s*\||\s*$)/);
  return m ? m[1]!.trim() : "";
}

function csvCell(v: string): string {
  // Always quote — keeps commas, quotes, and newlines safe.
  return `"${v.replace(/"/g, '""')}"`;
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
