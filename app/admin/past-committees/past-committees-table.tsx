"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { EmptyState, Table, Tbody, Td, Th, Thead, Tr } from "@/components/ui/table";
import { createPastTerm, deletePastTerm, updatePastTerm } from "./actions";

export type PastTermRow = {
  id: string;
  fy_label: string;
  starts_on: string;
  ends_on: string;
  president_name: string;
  president_member_id: string | null;
  president_photo_url: string | null;
  achievements: string | null;
  display_order: number;
};

type Mode =
  | { kind: "closed" }
  | { kind: "create" }
  | { kind: "edit"; term: PastTermRow };

export function PastCommitteesTable({ rows }: { rows: PastTermRow[] }) {
  const [mode, setMode] = useState<Mode>({ kind: "closed" });

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs text-muted">
          {rows.length} term{rows.length === 1 ? "" : "s"} on record. The public
          page only renders an entry if it has at least a president and an FY
          label — achievements show only when text is filled.
        </p>
        <Button onClick={() => setMode({ kind: "create" })}>
          <Plus className="h-3.5 w-3.5" /> Add term
        </Button>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No past terms recorded yet"
          body="Click 'Add term' to log a previous committee. Each entry can include the president, the term dates, and an achievements summary written in markdown."
        />
      ) : (
        <Table>
          <Thead>
            <Tr>
              <Th>Term</Th>
              <Th>President</Th>
              <Th>Dates</Th>
              <Th>Achievements</Th>
              <Th className="text-right">Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {rows.map((t) => (
              <Tr key={t.id}>
                <Td>
                  <div className="font-medium text-heading">{t.fy_label}</div>
                </Td>
                <Td>{t.president_name}</Td>
                <Td className="font-mono text-xs text-muted">
                  {t.starts_on} → {t.ends_on}
                </Td>
                <Td className="text-xs text-muted">
                  {t.achievements ? (
                    <span title={t.achievements}>
                      {t.achievements.slice(0, 80)}
                      {t.achievements.length > 80 ? "…" : ""}
                    </span>
                  ) : (
                    <span className="italic">—</span>
                  )}
                </Td>
                <Td>
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setMode({ kind: "edit", term: t })}
                      aria-label={`Edit ${t.fy_label}`}
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-danger hover:bg-red-50"
                      onClick={async () => {
                        if (
                          confirm(
                            `Delete the ${t.fy_label} term entry? This cannot be undone.`,
                          )
                        ) {
                          await deletePastTerm(t.id);
                        }
                      }}
                      aria-label={`Delete ${t.fy_label}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
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
        onOpenChange={(open) => !open && setMode({ kind: "closed" })}
        title={mode.kind === "edit" ? "Edit past term" : "Add past term"}
        description={
          mode.kind === "edit"
            ? "Update the historical record for this term."
            : "Log a previous committee term. Only President + FY label are required — fill achievements when you have a story to tell."
        }
      >
        {mode.kind !== "closed" && (
          <PastTermForm
            initial={mode.kind === "edit" ? mode.term : undefined}
            onDone={() => setMode({ kind: "closed" })}
          />
        )}
      </Dialog>
    </>
  );
}

function PastTermForm({
  initial,
  onDone,
}: {
  initial?: PastTermRow;
  onDone: () => void;
}) {
  const isEdit = !!initial;
  return (
    <form
      action={async (fd) => {
        if (isEdit) {
          await updatePastTerm(initial!.id, fd);
        } else {
          await createPastTerm(fd);
        }
        onDone();
      }}
      className="space-y-5"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="FY label" htmlFor="fy_label" required>
          <Input
            id="fy_label"
            name="fy_label"
            placeholder="FY 2024-25"
            defaultValue={initial?.fy_label ?? ""}
            required
          />
        </Field>
        <Field label="Display order" htmlFor="display_order" hint="Lower numbers come first within a year.">
          <Input
            id="display_order"
            name="display_order"
            type="number"
            defaultValue={initial?.display_order ?? 0}
          />
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Starts on" htmlFor="starts_on" required>
          <Input
            id="starts_on"
            name="starts_on"
            type="date"
            defaultValue={initial?.starts_on ?? ""}
            required
          />
        </Field>
        <Field label="Ends on" htmlFor="ends_on" required>
          <Input
            id="ends_on"
            name="ends_on"
            type="date"
            defaultValue={initial?.ends_on ?? ""}
            required
          />
        </Field>
      </div>

      <Field label="President name" htmlFor="president_name" required>
        <Input
          id="president_name"
          name="president_name"
          placeholder="Shri Vivek Kanodia"
          defaultValue={initial?.president_name ?? ""}
          required
        />
      </Field>

      <Field
        label="Linked member"
        htmlFor="president_member_id"
        hint="Optional — paste the member id (e.g. 'vivek-kanodia') if they have a profile."
      >
        <Input
          id="president_member_id"
          name="president_member_id"
          defaultValue={initial?.president_member_id ?? ""}
        />
      </Field>

      <ImageUploadField
        name="president_photo_url"
        defaultValue={initial?.president_photo_url ?? ""}
        folder="chapters"
        label="President photo"
        hint="Square crops look best. Skip if you don't have one — the public page won't show a placeholder avatar."
        aspect="1/1"
      />

      <Field
        label="Achievements"
        htmlFor="achievements"
        hint="Markdown. Public page renders this only when text is present — leave blank to omit."
      >
        <Textarea
          id="achievements"
          name="achievements"
          rows={8}
          defaultValue={initial?.achievements ?? ""}
          placeholder="Highlights of the term — drives, mandates met, milestones hit. Use ## headings, - bullets, **bold** etc."
        />
      </Field>

      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit">{isEdit ? "Save changes" : "Add term"}</Button>
      </div>
    </form>
  );
}
