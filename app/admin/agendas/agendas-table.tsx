"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { EmptyState, Table, Tbody, Td, Th, Thead, Tr } from "@/components/ui/table";
import {
  AGENDA_CATEGORIES,
  AGENDA_PRIORITY,
  AGENDA_STATUS,
  type Agenda,
  categoryLabel,
  priorityTone,
  statusTone,
} from "@/lib/agendas";
import Link from "next/link";
import { ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { createAgenda, deleteAgenda, updateAgenda } from "./actions";

type AgendaRow = Agenda & { update_count?: number; comment_count?: number };

type Mode =
  | { kind: "closed" }
  | { kind: "create" }
  | { kind: "edit"; agenda: AgendaRow };

export function AgendasTable({ rows }: { rows: AgendaRow[] }) {
  const [mode, setMode] = useState<Mode>({ kind: "closed" });

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-muted">{rows.length} agendas</p>
        <Button onClick={() => setMode({ kind: "create" })}>
          <Plus className="h-4 w-4" /> New agenda
        </Button>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No agendas yet"
          description="Create the first one — for example, an LPG / paper-rate / supply-shortage issue the chapter is tracking."
          action={
            <Button onClick={() => setMode({ kind: "create" })}>
              <Plus className="h-4 w-4" /> New agenda
            </Button>
          }
        />
      ) : (
        <Table>
          <Thead>
            <Tr>
              <Th>Title</Th>
              <Th>Category</Th>
              <Th>Status</Th>
              <Th>Priority</Th>
              <Th>Started</Th>
              <Th>Updates</Th>
              <Th>Comments</Th>
              <Th className="text-right">Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {rows.map((a) => (
              <Tr key={a.id}>
                <Td>
                  <div className="font-medium text-heading">{a.title}</div>
                  {a.summary && (
                    <div className="line-clamp-2 text-xs text-muted">{a.summary}</div>
                  )}
                  <div className="mt-1 font-mono text-[10px] text-muted">{a.slug}</div>
                </Td>
                <Td>
                  <Badge tone="neutral">{categoryLabel(a.category)}</Badge>
                </Td>
                <Td>
                  <span className={"inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider " + statusTone(a.status)}>
                    {a.status}
                  </span>
                </Td>
                <Td>
                  <span className={"inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider " + priorityTone(a.priority)}>
                    {a.priority}
                  </span>
                </Td>
                <Td className="text-xs tabular-nums text-muted">{a.started_on}</Td>
                <Td className="text-sm tabular-nums">{a.update_count ?? 0}</Td>
                <Td className="text-sm tabular-nums">{a.comment_count ?? 0}</Td>
                <Td>
                  <div className="flex justify-end gap-1">
                    <Link
                      href={`/admin/agendas/${a.id}`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-sm text-heading hover:bg-surface"
                      title="Manage updates + comments"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setMode({ kind: "edit", agenda: a })}
                      aria-label={`Edit ${a.title}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        if (
                          confirm(
                            `Delete agenda "${a.title}"? All its updates and comments will be removed too.`,
                          )
                        ) {
                          await deleteAgenda(a.id);
                        }
                      }}
                      aria-label={`Delete ${a.title}`}
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
        open={mode.kind !== "closed"}
        onOpenChange={(o) => !o && setMode({ kind: "closed" })}
        title={mode.kind === "edit" ? "Edit agenda" : "New agenda"}
      >
        {mode.kind !== "closed" && (
          <AgendaForm
            agenda={mode.kind === "edit" ? mode.agenda : null}
            onDone={() => setMode({ kind: "closed" })}
          />
        )}
      </Dialog>
    </>
  );
}

function AgendaForm({
  agenda,
  onDone,
}: {
  agenda: AgendaRow | null;
  onDone: () => void;
}) {
  const isEdit = !!agenda;

  async function action(formData: FormData) {
    if (isEdit && agenda) await updateAgenda(agenda.id, formData);
    else await createAgenda(formData);
    onDone();
  }

  return (
    <form action={action} className="space-y-4">
      <Field label="Title" htmlFor="title" required>
        <Input
          id="title"
          name="title"
          required
          defaultValue={agenda?.title ?? ""}
          placeholder="e.g. LPG price increase impacting board manufacturers"
        />
      </Field>
      <Field label="Slug (auto-generated from title if blank)" htmlFor="slug">
        <Input id="slug" name="slug" defaultValue={agenda?.slug ?? ""} placeholder="auto" />
      </Field>
      <Field label="Brief (3-5 lines, shown on the list)" htmlFor="summary">
        <textarea
          id="summary"
          name="summary"
          rows={3}
          defaultValue={agenda?.summary ?? ""}
          className="w-full rounded-sm border border-border bg-bg px-3 py-2 text-sm focus-visible:border-heading focus-visible:outline-none"
          placeholder="One-paragraph summary that goes on the agendas listing."
        />
      </Field>
      <Field label="Body (full description, shown at top of the detail page)" htmlFor="body">
        <textarea
          id="body"
          name="body"
          rows={6}
          defaultValue={agenda?.body ?? ""}
          className="w-full rounded-sm border border-border bg-bg px-3 py-2 text-sm focus-visible:border-heading focus-visible:outline-none"
          placeholder="Full description, background, why it matters, what's at stake."
        />
      </Field>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Field label="Category" htmlFor="category">
          <Select id="category" name="category" defaultValue={agenda?.category ?? "other"}>
            {AGENDA_CATEGORIES.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
        </Field>
        <Field label="Status" htmlFor="status">
          <Select id="status" name="status" defaultValue={agenda?.status ?? "active"}>
            {AGENDA_STATUS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
        </Field>
        <Field label="Priority" htmlFor="priority">
          <Select id="priority" name="priority" defaultValue={agenda?.priority ?? "medium"}>
            {AGENDA_PRIORITY.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
        </Field>
        <Field label="Visibility" htmlFor="visibility">
          <Select id="visibility" name="visibility" defaultValue={agenda?.visibility ?? "public"}>
            <option value="public">Public</option>
            <option value="members_only">Members only</option>
          </Select>
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Field label="Started" htmlFor="started_on">
          <Input id="started_on" name="started_on" type="date" defaultValue={agenda?.started_on ?? ""} />
        </Field>
        <Field label="Target resolution" htmlFor="target_resolution_on">
          <Input id="target_resolution_on" name="target_resolution_on" type="date" defaultValue={agenda?.target_resolution_on ?? ""} />
        </Field>
        <Field label="Resolved on" htmlFor="resolved_on">
          <Input id="resolved_on" name="resolved_on" type="date" defaultValue={agenda?.resolved_on ?? ""} />
        </Field>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
        <Button type="submit">{isEdit ? "Save changes" : "Create agenda"}</Button>
      </div>
    </form>
  );
}
