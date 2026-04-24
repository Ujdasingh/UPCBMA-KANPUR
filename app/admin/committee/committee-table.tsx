"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { EmptyState, Table, Tbody, Td, Th, Thead, Tr } from "@/components/ui/table";
import type {
  CommitteeAppointment,
  CommitteeRole,
  Member,
} from "@/lib/db-types";
import { formatDate } from "@/lib/utils";
import { Pencil, Plus, Square, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import {
  createAppointment,
  deleteAppointment,
  endAppointment,
  updateAppointment,
} from "./actions";

type Row = CommitteeAppointment & {
  member: Pick<Member, "id" | "name" | "email" | "company"> | null;
  role: Pick<CommitteeRole, "key" | "name" | "category"> | null;
};

type Mode =
  | { kind: "closed" }
  | { kind: "create" }
  | { kind: "edit"; row: Row };

const STATUS_TONE: Record<
  Row["status"],
  "success" | "neutral" | "warn"
> = {
  active: "success",
  inactive: "warn",
  ended: "neutral",
};

export function CommitteeTable({
  rows,
  members,
  roles,
}: {
  rows: Row[];
  members: Member[];
  roles: CommitteeRole[];
}) {
  const [mode, setMode] = useState<Mode>({ kind: "closed" });

  // Group appointments by role.category for a clearer picture.
  const grouped = useMemo(() => {
    const out: Record<string, Row[]> = {};
    for (const r of rows) {
      const cat = r.role?.category ?? "other";
      (out[cat] ??= []).push(r);
    }
    return out;
  }, [rows]);

  const categoryOrder: CommitteeRole["category"][] = [
    "executive",
    "area_head",
    "team_member",
    "past_president",
    "honorary",
  ];

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted">
          {rows.length} appointment{rows.length === 1 ? "" : "s"} across {roles.length} defined roles.
        </p>
        <Button onClick={() => setMode({ kind: "create" })}>
          <Plus className="h-4 w-4" /> New appointment
        </Button>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No committee appointments yet"
          description="Assign a role to a member to get started."
          action={
            <Button onClick={() => setMode({ kind: "create" })}>
              <Plus className="h-4 w-4" /> New appointment
            </Button>
          }
        />
      ) : (
        categoryOrder
          .filter((c) => grouped[c]?.length)
          .map((cat) => (
            <section key={cat} className="mb-8">
              <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                {cat.replace("_", " ")}
              </h2>
              <Table>
                <Thead>
                  <Tr>
                    <Th>Member</Th>
                    <Th>Role</Th>
                    <Th>Area</Th>
                    <Th>Term</Th>
                    <Th>Status</Th>
                    <Th className="text-right">Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {grouped[cat]!
                    .sort((a, b) => a.display_order - b.display_order)
                    .map((r) => (
                      <Tr key={r.id}>
                        <Td>
                          <div className="font-medium text-heading">
                            {r.member?.name ?? <span className="italic text-muted">deleted</span>}
                          </div>
                          <div className="text-xs text-muted">
                            {r.member?.company ?? ""}
                          </div>
                        </Td>
                        <Td className="text-sm">{r.role?.name ?? r.role_key}</Td>
                        <Td className="text-sm">{r.area_name ?? "—"}</Td>
                        <Td className="text-xs text-muted tabular-nums">
                          {formatDate(r.term_start)} → {formatDate(r.term_end)}
                        </Td>
                        <Td>
                          <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge>
                        </Td>
                        <Td>
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setMode({ kind: "edit", row: r })}
                              aria-label="Edit appointment"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            {r.status === "active" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={async () => {
                                  if (confirm("End this appointment?")) {
                                    await endAppointment(r.id);
                                  }
                                }}
                                aria-label="End appointment"
                              >
                                <Square className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={async () => {
                                if (
                                  confirm(
                                    "Delete this appointment? This cannot be undone.",
                                  )
                                ) {
                                  await deleteAppointment(r.id);
                                }
                              }}
                              aria-label="Delete appointment"
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
          ))
      )}

      <Dialog
        open={mode.kind !== "closed"}
        onOpenChange={(o) => !o && setMode({ kind: "closed" })}
        title={mode.kind === "edit" ? "Edit appointment" : "New appointment"}
      >
        {mode.kind !== "closed" && (
          <AppointmentForm
            row={mode.kind === "edit" ? mode.row : null}
            members={members}
            roles={roles}
            onDone={() => setMode({ kind: "closed" })}
          />
        )}
      </Dialog>
    </>
  );
}

function AppointmentForm({
  row,
  members,
  roles,
  onDone,
}: {
  row: Row | null;
  members: Member[];
  roles: CommitteeRole[];
  onDone: () => void;
}) {
  const isEdit = !!row;

  async function action(formData: FormData) {
    if (isEdit && row) {
      await updateAppointment(row.id, formData);
    } else {
      await createAppointment(formData);
    }
    onDone();
  }

  return (
    <form action={action} className="space-y-4">
      <Field label="Member" htmlFor="member_id" required>
        <Select
          id="member_id"
          name="member_id"
          required
          defaultValue={row?.member_id ?? ""}
        >
          <option value="" disabled>
            Choose a member…
          </option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} — {m.company ?? m.email}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Role" htmlFor="role_key" required>
        <Select
          id="role_key"
          name="role_key"
          required
          defaultValue={row?.role_key ?? ""}
        >
          <option value="" disabled>
            Choose a role…
          </option>
          {roles
            .filter((r) => r.active)
            .map((r) => (
              <option key={r.key} value={r.key}>
                {r.name} ({r.category.replace("_", " ")})
              </option>
            ))}
        </Select>
      </Field>

      <Field
        label="Area / portfolio"
        htmlFor="area_name"
        hint="Only required for area heads, e.g. Dada Nagar"
      >
        <Input
          id="area_name"
          name="area_name"
          defaultValue={row?.area_name ?? ""}
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Term start" htmlFor="term_start" required>
          <Input
            id="term_start"
            name="term_start"
            type="date"
            required
            defaultValue={row?.term_start ?? ""}
          />
        </Field>
        <Field label="Term end" htmlFor="term_end" required>
          <Input
            id="term_end"
            name="term_end"
            type="date"
            required
            defaultValue={row?.term_end ?? ""}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Status" htmlFor="status">
          <Select id="status" name="status" defaultValue={row?.status ?? "active"}>
            <option value="active">active</option>
            <option value="inactive">inactive</option>
            <option value="ended">ended</option>
          </Select>
        </Field>
        <Field
          label="Display order"
          htmlFor="display_order"
          hint="Lower shows first"
        >
          <Input
            id="display_order"
            name="display_order"
            type="number"
            min={0}
            defaultValue={row?.display_order ?? 0}
          />
        </Field>
      </div>

      <Field label="Notes" htmlFor="notes">
        <Textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={row?.notes ?? ""}
          placeholder="Optional — any context about this appointment."
        />
      </Field>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit">
          {isEdit ? "Save changes" : "Create appointment"}
        </Button>
      </div>
    </form>
  );
}
