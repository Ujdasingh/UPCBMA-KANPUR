"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { EmptyState, Table, Tbody, Td, Th, Thead, Tr } from "@/components/ui/table";
import type { EventItem } from "@/lib/db-types";
import { formatDate } from "@/lib/utils";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { createEvent, deleteEvent, updateEvent } from "./actions";

type Mode =
  | { kind: "closed" }
  | { kind: "create" }
  | { kind: "edit"; item: EventItem };

export function EventsTable({ rows }: { rows: EventItem[] }) {
  const [mode, setMode] = useState<Mode>({ kind: "closed" });

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = rows.filter((r) => !r.event_date || r.event_date >= today);
  const past = rows.filter((r) => r.event_date && r.event_date < today);

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted">
          {upcoming.length} upcoming · {past.length} past
        </p>
        <Button onClick={() => setMode({ kind: "create" })}>
          <Plus className="h-4 w-4" /> New event
        </Button>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No events yet"
          description="Add your first event to get started."
        />
      ) : (
        <>
          <EventSection
            title="Upcoming"
            rows={upcoming}
            onEdit={(e) => setMode({ kind: "edit", item: e })}
          />
          {past.length > 0 && (
            <EventSection
              title="Past"
              rows={past}
              onEdit={(e) => setMode({ kind: "edit", item: e })}
              muted
            />
          )}
        </>
      )}

      <Dialog
        open={mode.kind !== "closed"}
        onOpenChange={(o) => !o && setMode({ kind: "closed" })}
        title={mode.kind === "edit" ? "Edit event" : "New event"}
      >
        {mode.kind !== "closed" && (
          <EventForm
            item={mode.kind === "edit" ? mode.item : null}
            onDone={() => setMode({ kind: "closed" })}
          />
        )}
      </Dialog>
    </>
  );
}

function EventSection({
  title,
  rows,
  onEdit,
  muted,
}: {
  title: string;
  rows: EventItem[];
  onEdit: (e: EventItem) => void;
  muted?: boolean;
}) {
  if (rows.length === 0) return null;

  return (
    <section className={`mb-8 ${muted ? "opacity-75" : ""}`}>
      <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
        {title}
      </h2>
      <Table>
        <Thead>
          <Tr>
            <Th>Date</Th>
            <Th>Time</Th>
            <Th>Name</Th>
            <Th>Venue</Th>
            <Th>Type</Th>
            <Th className="text-right">Actions</Th>
          </Tr>
        </Thead>
        <Tbody>
          {rows.map((e) => (
            <Tr key={e.id}>
              <Td className="text-xs tabular-nums text-muted">
                {e.event_date ? formatDate(e.event_date) : "—"}
              </Td>
              <Td className="text-xs tabular-nums text-muted">
                {e.event_time?.slice(0, 5) ?? "—"}
              </Td>
              <Td>
                <div className="font-medium text-heading">{e.name}</div>
                {e.description && (
                  <div className="line-clamp-1 max-w-md text-xs text-muted">
                    {e.description}
                  </div>
                )}
              </Td>
              <Td className="text-sm">{e.venue ?? "—"}</Td>
              <Td>
                {e.recurring ? (
                  <Badge tone="info">Recurring</Badge>
                ) : (
                  <Badge tone="neutral">One-off</Badge>
                )}
              </Td>
              <Td>
                <div className="flex justify-end gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onEdit(e)}
                    aria-label="Edit event"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      if (confirm("Delete this event? This cannot be undone.")) {
                        await deleteEvent(e.id);
                      }
                    }}
                    aria-label="Delete event"
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
    </section>
  );
}

function EventForm({
  item,
  onDone,
}: {
  item: EventItem | null;
  onDone: () => void;
}) {
  const isEdit = !!item;

  async function action(formData: FormData) {
    if (isEdit && item) {
      await updateEvent(item.id, formData);
    } else {
      await createEvent(formData);
    }
    onDone();
  }

  return (
    <form action={action} className="space-y-4">
      <Field label="Name" htmlFor="name" required>
        <Input
          id="name"
          name="name"
          required
          defaultValue={item?.name ?? ""}
          placeholder="Monthly members’ meet"
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Date" htmlFor="event_date">
          <Input
            id="event_date"
            name="event_date"
            type="date"
            defaultValue={item?.event_date ?? ""}
          />
        </Field>
        <Field label="Time" htmlFor="event_time">
          <Input
            id="event_time"
            name="event_time"
            type="time"
            defaultValue={item?.event_time?.slice(0, 5) ?? ""}
          />
        </Field>
      </div>

      <Field label="Venue" htmlFor="venue">
        <Input
          id="venue"
          name="venue"
          defaultValue={item?.venue ?? ""}
          placeholder="IIA Bhawan, Dada Nagar"
        />
      </Field>

      <Field label="Description" htmlFor="description">
        <Textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={item?.description ?? ""}
        />
      </Field>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="recurring"
          defaultChecked={item?.recurring ?? false}
          className="h-4 w-4 rounded-sm border-rule"
        />
        <span>Recurring event</span>
      </label>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit">
          {isEdit ? "Save changes" : "Create event"}
        </Button>
      </div>
    </form>
  );
}
