"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { EmptyState, Table, Tbody, Td, Th, Thead, Tr } from "@/components/ui/table";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { createCategory, deleteCategory, updateCategory } from "./actions";

type Row = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  member_count: number;
};

type Mode =
  | { kind: "closed" }
  | { kind: "create" }
  | { kind: "edit"; row: Row };

export function CategoriesTable({ rows }: { rows: Row[] }) {
  const [mode, setMode] = useState<Mode>({ kind: "closed" });

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {rows.length} categories defined for this chapter
        </p>
        <Button onClick={() => setMode({ kind: "create" })}>
          <Plus className="h-4 w-4" /> New category
        </Button>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No categories yet"
          description="Chapters typically have one or two categories, e.g. Executive and Member, or Life / Patron / Associate."
          action={
            <Button onClick={() => setMode({ kind: "create" })}>
              <Plus className="h-4 w-4" /> New category
            </Button>
          }
        />
      ) : (
        <Table>
          <Thead>
            <Tr>
              <Th>Order</Th>
              <Th>Name</Th>
              <Th>Slug</Th>
              <Th>Members</Th>
              <Th className="text-right">Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {rows.map((r) => (
              <Tr key={r.id}>
                <Td className="text-sm tabular-nums">{r.sort_order}</Td>
                <Td>
                  <div className="font-medium text-heading">{r.name}</div>
                  {r.description && (
                    <div className="text-xs text-muted">{r.description}</div>
                  )}
                </Td>
                <Td className="font-mono text-[11px] text-muted">{r.slug}</Td>
                <Td>
                  <Badge tone="neutral">{r.member_count}</Badge>
                </Td>
                <Td>
                  <div className="flex justify-end gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setMode({ kind: "edit", row: r })}
                      aria-label={`Edit ${r.name}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        if (
                          confirm(
                            `Delete category "${r.name}"? Blocked if it still has members assigned.`,
                          )
                        ) {
                          await deleteCategory(r.id);
                        }
                      }}
                      aria-label={`Delete ${r.name}`}
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
        title={mode.kind === "edit" ? "Edit category" : "New member category"}
      >
        {mode.kind !== "closed" && (
          <CategoryForm
            row={mode.kind === "edit" ? mode.row : null}
            onDone={() => setMode({ kind: "closed" })}
          />
        )}
      </Dialog>
    </>
  );
}

function CategoryForm({
  row,
  onDone,
}: {
  row: Row | null;
  onDone: () => void;
}) {
  const isEdit = !!row;

  async function action(formData: FormData) {
    if (isEdit && row) {
      await updateCategory(row.id, formData);
    } else {
      await createCategory(formData);
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
          defaultValue={row?.name ?? ""}
          placeholder="Executive Member"
        />
      </Field>
      <Field label="Description (optional)" htmlFor="description">
        <Input
          id="description"
          name="description"
          defaultValue={row?.description ?? ""}
          placeholder="Short internal description"
        />
      </Field>
      <Field label="Display order" htmlFor="sort_order" hint="Lower = shown first">
        <Input
          id="sort_order"
          name="sort_order"
          type="number"
          min="0"
          defaultValue={String(row?.sort_order ?? 0)}
        />
      </Field>
      {!isEdit && (
        <Field label="Slug (optional)" htmlFor="slug" hint="Auto-generated from name. Override rarely needed.">
          <Input id="slug" name="slug" placeholder="auto" />
        </Field>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit">
          {isEdit ? "Save changes" : "Create category"}
        </Button>
      </div>
    </form>
  );
}
