"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { EmptyState, Table, Tbody, Td, Th, Thead, Tr } from "@/components/ui/table";
import type { LabTest } from "@/lib/db-types";
import { formatInr } from "@/lib/utils";
import { Pencil, Plus, Power, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  createLabTest,
  deleteLabTest,
  toggleLabTestActive,
  updateLabTest,
} from "./actions";

type Mode =
  | { kind: "closed" }
  | { kind: "create" }
  | { kind: "edit"; test: LabTest };

export function LabTestsTable({ rows }: { rows: LabTest[] }) {
  const [mode, setMode] = useState<Mode>({ kind: "closed" });

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted">
          {rows.length} test{rows.length === 1 ? "" : "s"} in catalogue.
        </p>
        <Button onClick={() => setMode({ kind: "create" })}>
          <Plus className="h-4 w-4" /> New test
        </Button>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No lab tests yet"
          description="Add your first test to the catalogue."
        />
      ) : (
        <Table>
          <Thead>
            <Tr>
              <Th>Code</Th>
              <Th>Name</Th>
              <Th>Sample</Th>
              <Th>Price</Th>
              <Th>TAT</Th>
              <Th>Status</Th>
              <Th className="text-right">Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {rows.map((t) => (
              <Tr key={t.code}>
                <Td className="font-mono text-xs font-semibold">{t.code}</Td>
                <Td>
                  <div className="font-medium text-heading">{t.name}</div>
                  {t.description && (
                    <div className="max-w-md text-xs text-muted">
                      {t.description}
                    </div>
                  )}
                </Td>
                <Td className="text-sm">{t.sample_type ?? "—"}</Td>
                <Td className="text-sm tabular-nums">
                  {t.price_inr == null ? (
                    <span className="text-muted">—</span>
                  ) : (
                    formatInr(t.price_inr)
                  )}
                </Td>
                <Td className="text-sm tabular-nums">
                  {t.turnaround_days == null
                    ? "—"
                    : `${t.turnaround_days} d`}
                </Td>
                <Td>
                  <Badge tone={t.active ? "success" : "neutral"}>
                    {t.active ? "Active" : "Inactive"}
                  </Badge>
                </Td>
                <Td>
                  <div className="flex justify-end gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setMode({ kind: "edit", test: t })}
                      aria-label={`Edit ${t.code}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        await toggleLabTestActive(t.code, !t.active);
                      }}
                      aria-label={t.active ? "Deactivate" : "Activate"}
                    >
                      <Power className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        if (confirm(`Delete ${t.code}? This cannot be undone.`)) {
                          await deleteLabTest(t.code);
                        }
                      }}
                      aria-label={`Delete ${t.code}`}
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
        title={mode.kind === "edit" ? "Edit lab test" : "New lab test"}
      >
        {mode.kind !== "closed" && (
          <TestForm
            test={mode.kind === "edit" ? mode.test : null}
            onDone={() => setMode({ kind: "closed" })}
          />
        )}
      </Dialog>
    </>
  );
}

function TestForm({
  test,
  onDone,
}: {
  test: LabTest | null;
  onDone: () => void;
}) {
  const isEdit = !!test;

  async function action(formData: FormData) {
    if (isEdit && test) {
      await updateLabTest(test.code, formData);
    } else {
      await createLabTest(formData);
    }
    onDone();
  }

  return (
    <form action={action} className="space-y-4">
      {!isEdit && (
        <Field
          label="Code"
          htmlFor="code"
          required
          hint="Short uppercase identifier, e.g. BFT"
        >
          <Input
            id="code"
            name="code"
            required
            placeholder="BFT"
            className="font-mono uppercase"
          />
        </Field>
      )}

      <Field label="Name" htmlFor="name" required>
        <Input
          id="name"
          name="name"
          required
          defaultValue={test?.name ?? ""}
          placeholder="Bursting Frequency Test"
        />
      </Field>

      <Field label="Description" htmlFor="description">
        <Textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={test?.description ?? ""}
          placeholder="What this test measures and why it matters."
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Sample type" htmlFor="sample_type">
          <Input
            id="sample_type"
            name="sample_type"
            defaultValue={test?.sample_type ?? ""}
            placeholder="Corrugated sheet"
          />
        </Field>
        <Field
          label="Price (INR)"
          htmlFor="price_inr"
          hint="Leave blank if free for members"
        >
          <Input
            id="price_inr"
            name="price_inr"
            type="number"
            min={0}
            step="1"
            defaultValue={test?.price_inr ?? ""}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Turnaround (days)" htmlFor="turnaround_days">
          <Input
            id="turnaround_days"
            name="turnaround_days"
            type="number"
            min={0}
            step="1"
            defaultValue={test?.turnaround_days ?? ""}
          />
        </Field>
        <Field label="Sort order" htmlFor="sort_order">
          <Input
            id="sort_order"
            name="sort_order"
            type="number"
            min={0}
            defaultValue={test?.sort_order ?? 0}
          />
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="active"
          defaultChecked={test?.active ?? true}
          className="h-4 w-4 rounded-sm border-rule"
        />
        <span>Active in catalogue</span>
      </label>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit">
          {isEdit ? "Save changes" : "Add test"}
        </Button>
      </div>
    </form>
  );
}
