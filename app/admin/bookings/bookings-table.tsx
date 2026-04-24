"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Select, Textarea } from "@/components/ui/input";
import { EmptyState, Table, Tbody, Td, Th, Thead, Tr } from "@/components/ui/table";
import type { Booking } from "@/lib/db-types";
import { formatDate, formatDateTime } from "@/lib/utils";
import { Eye, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  deleteBooking,
  updateBookingNotes,
  updateBookingStatus,
} from "./actions";

const STATUS_TONE: Record<
  Booking["status"],
  "info" | "warn" | "success" | "neutral" | "danger"
> = {
  pending: "warn",
  confirmed: "info",
  in_progress: "info",
  completed: "success",
  cancelled: "neutral",
};

const STATUS_ORDER: Booking["status"][] = [
  "pending",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
];

export function BookingsTable({ rows }: { rows: Booking[] }) {
  const [detail, setDetail] = useState<Booking | null>(null);
  const [filter, setFilter] = useState<Booking["status"] | "all">("all");

  const filtered =
    filter === "all" ? rows : rows.filter((r) => r.status === filter);

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-1">
          {(["all", ...STATUS_ORDER] as const).map((s) => {
            const count =
              s === "all" ? rows.length : rows.filter((r) => r.status === s).length;
            return (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`rounded-sm border px-3 py-1 text-xs transition-colors ${
                  filter === s
                    ? "border-heading bg-heading text-white"
                    : "border-rule bg-bg text-heading hover:border-heading"
                }`}
              >
                {s.replace("_", " ")} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={filter === "all" ? "No bookings yet" : `No ${filter} bookings`}
          description="Lab booking requests will appear here."
        />
      ) : (
        <Table>
          <Thead>
            <Tr>
              <Th>Submitted</Th>
              <Th>Member</Th>
              <Th>Tests</Th>
              <Th>Samples</Th>
              <Th>Preferred</Th>
              <Th>Status</Th>
              <Th className="text-right">Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {filtered.map((b) => (
              <Tr key={b.id}>
                <Td className="text-xs tabular-nums text-muted">
                  {formatDateTime(b.submitted_at)}
                </Td>
                <Td>
                  <div className="font-medium text-heading">
                    {b.member_name ?? "—"}
                  </div>
                  <div className="text-xs text-muted">
                    {b.member_company ?? ""}
                  </div>
                </Td>
                <Td className="text-xs">
                  {b.tests && b.tests.length
                    ? b.tests.join(", ")
                    : "—"}
                </Td>
                <Td className="text-sm tabular-nums">{b.sample_count ?? "—"}</Td>
                <Td className="text-xs tabular-nums text-muted">
                  {b.preferred_date ? formatDate(b.preferred_date) : "—"}
                </Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <Badge tone={STATUS_TONE[b.status]}>{b.status}</Badge>
                    <StatusSelect booking={b} />
                  </div>
                </Td>
                <Td>
                  <div className="flex justify-end gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDetail(b)}
                      aria-label="View booking"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        if (confirm("Delete this booking? This cannot be undone.")) {
                          await deleteBooking(b.id);
                        }
                      }}
                      aria-label="Delete booking"
                      className="text-danger hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}

      <Dialog
        open={!!detail}
        onOpenChange={(o) => !o && setDetail(null)}
        title={detail ? `Booking ${detail.id.slice(0, 8)}…` : ""}
        description={
          detail
            ? `Submitted ${formatDateTime(detail.submitted_at)}`
            : undefined
        }
      >
        {detail && <BookingDetail booking={detail} onDone={() => setDetail(null)} />}
      </Dialog>
    </>
  );
}

function StatusSelect({ booking }: { booking: Booking }) {
  return (
    <Select
      value={booking.status}
      onChange={async (e) => {
        await updateBookingStatus(
          booking.id,
          e.target.value as Booking["status"],
        );
      }}
      className="!h-7 !py-0 text-xs"
    >
      {STATUS_ORDER.map((s) => (
        <option key={s} value={s}>
          {s.replace("_", " ")}
        </option>
      ))}
    </Select>
  );
}

function BookingDetail({
  booking,
  onDone,
}: {
  booking: Booking;
  onDone: () => void;
}) {
  async function saveNotes(formData: FormData) {
    await updateBookingNotes(booking.id, formData);
    onDone();
  }

  return (
    <div className="space-y-5">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <dt className="text-xs uppercase tracking-[0.12em] text-muted">
          Member
        </dt>
        <dd>{booking.member_name ?? "—"}</dd>

        <dt className="text-xs uppercase tracking-[0.12em] text-muted">
          Company
        </dt>
        <dd>{booking.member_company ?? "—"}</dd>

        <dt className="text-xs uppercase tracking-[0.12em] text-muted">
          Tests
        </dt>
        <dd>{booking.tests?.join(", ") ?? "—"}</dd>

        <dt className="text-xs uppercase tracking-[0.12em] text-muted">
          Samples
        </dt>
        <dd className="tabular-nums">{booking.sample_count ?? "—"}</dd>

        <dt className="text-xs uppercase tracking-[0.12em] text-muted">
          Preferred date
        </dt>
        <dd className="tabular-nums">
          {booking.preferred_date ? formatDate(booking.preferred_date) : "—"}
        </dd>

        <dt className="text-xs uppercase tracking-[0.12em] text-muted">
          Status
        </dt>
        <dd>
          <Badge tone={STATUS_TONE[booking.status]}>{booking.status}</Badge>
        </dd>
      </dl>

      <form action={saveNotes} className="space-y-3">
        <Field label="Internal notes" htmlFor="notes">
          <Textarea
            id="notes"
            name="notes"
            rows={4}
            defaultValue={booking.notes ?? ""}
            placeholder="Only visible to admins."
          />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onDone}>
            Close
          </Button>
          <Button type="submit">Save notes</Button>
        </div>
      </form>
    </div>
  );
}
