"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { EmptyState, Table, Tbody, Td, Th, Thead, Tr } from "@/components/ui/table";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { createRole, deleteRole, seedDefaultRoles, updateRole } from "./actions";

type Row = {
  key: string;
  name: string;
  category: string;
  description: string | null;
  sort_order: number;
  active: boolean;
  chapter_id: string;
};

const CATEGORY_OPTIONS = [
  { value: "office_bearer", label: "Office bearer" },
  { value: "executive", label: "Executive" },
  { value: "zonal", label: "Zonal" },
  { value: "advisory", label: "Advisor" },
  { value: "special", label: "Special invitee" },
];

type Mode =
  | { kind: "closed" }
  | { kind: "create" }
  | { kind: "edit"; role: Row };

export function RolesTable({ rows }: { rows: Row[] }) {
  const [mode, setMode] = useState<Mode>({ kind: "closed" });

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {rows.length} roles defined for this chapter
        </p>
        <div className="flex gap-2">
          {rows.length === 0 && (
            <form action={seedDefaultRoles}>
              <Button type="submit" variant="secondary">
                Seed default roles
              </Button>
            </form>
          )}
          <Button onClick={() => setMode({ kind: "create" })}>
            <Plus className="h-4 w-4" /> New role
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No roles yet"
          description="Add roles manually or seed the conventional office-bearer list with one click."
          action={
            <div className="flex gap-2">
              <form action={seedDefaultRoles}>
                <Button type="submit" variant="secondary">
                  Seed default roles
                </Button>
              </form>
              <Button onClick={() => setMode({ kind: "create" })}>
                <Plus className="h-4 w-4" /> New role
              </Button>
            </div>
          }
        />
      ) : (
        <Table>
          <Thead>
            <Tr>
              <Th>Order</Th>
              <Th>Name</Th>
              <Th>Category</Th>
              <Th>Key</Th>
              <Th>Status</Th>
              <Th className="text-right">Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {rows.map((r) => (
              <Tr key={r.key}>
                <Td className="text-sm tabular-nums">{r.sort_order}</Td>
                <Td>
                  <div className="font-medium text-heading">{r.name}</div>
                  {r.description && (
                    <div className="text-xs text-muted">{r.description}</div>
                  )}
                </Td>
                <Td>
                  <Badge tone="neutral">
                    {CATEGORY_OPTIONS.find((o) => o.value === r.category)?.label ?? r.category}
                  </Badge>
                </Td>
                <Td className="font-mono text-[11px] text-muted">{r.key}</Td>
                <Td>
                  <Badge tone={r.active ? "success" : "neutral"}>
                    {r.active ? "Active" : "Inactive"}
                  </Badge>
                </Td>
                <Td>
                  <div className="flex justify-end gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setMode({ kind: "edit", role: r })}
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
                            `Delete role "${r.name}"? Blocked automatically if any appointments reference it.`,
                          )
                        ) {
                          await deleteRole(r.key);
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
        title={mode.kind === "edit" ? "Edit role" : "New committee role"}
      >
        {mode.kind !== "closed" && (
          <RoleForm
            role={mode.kind === "edit" ? mode.role : null}
            onDone={() => setMode({ kind: "closed" })}
          />
        )}
      </Dialog>
    </>
  );
}

function RoleForm({ role, onDone }: { role: Row | null; onDone: () => void }) {
  const isEdit = !!role;

  async function action(formData: FormData) {
    if (isEdit && role) {
      await updateRole(role.key, formData);
    } else {
      await createRole(formData);
    }
    onDone();
  }

  return (
    <form action={action} className="space-y-4">
      <Field label="Role name" htmlFor="name" required>
        <Input
          id="name"
          name="name"
          required
          defaultValue={role?.name ?? ""}
          placeholder="President"
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Category" htmlFor="category">
          <Select
            id="category"
            name="category"
            defaultValue={role?.category ?? "office_bearer"}
          >
            {CATEGORY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Display order" htmlFor="sort_order" hint="Lower = shown first">
          <Input
            id="sort_order"
            name="sort_order"
            type="number"
            min="0"
            defaultValue={String(role?.sort_order ?? 0)}
          />
        </Field>
      </div>

      <Field label="Description (optional)" htmlFor="description">
        <Input
          id="description"
          name="description"
          defaultValue={role?.description ?? ""}
          placeholder="Short description for internal reference"
        />
      </Field>

      {!isEdit && (
        <Field
          label="Key (optional)"
          htmlFor="key"
          hint="Usually auto-generated from chapter + name. Override only if needed."
        >
          <Input
            id="key"
            name="key"
            placeholder="auto"
          />
        </Field>
      )}

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="active"
          defaultChecked={role?.active ?? true}
          className="h-4 w-4 rounded-sm border-rule"
        />
        <span>Active (available for assignment)</span>
      </label>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit">
          {isEdit ? "Save changes" : "Create role"}
        </Button>
      </div>
    </form>
  );
}
