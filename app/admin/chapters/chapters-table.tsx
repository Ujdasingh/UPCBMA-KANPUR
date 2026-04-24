"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { EmptyState, Table, Tbody, Td, Th, Thead, Tr } from "@/components/ui/table";
import type { Chapter } from "@/lib/chapters";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { createChapter, deleteChapter, updateChapter } from "./actions";

type Mode =
  | { kind: "closed" }
  | { kind: "create" }
  | { kind: "edit"; chapter: Chapter };

export function ChaptersTable({
  rows,
}: {
  rows: (Chapter & { member_count: number })[];
}) {
  const [mode, setMode] = useState<Mode>({ kind: "closed" });

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted">
          {rows.length} chapters registered
        </p>
        <Button onClick={() => setMode({ kind: "create" })}>
          <Plus className="h-4 w-4" /> New chapter
        </Button>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No chapters yet"
          description="Create the first chapter."
          action={
            <Button onClick={() => setMode({ kind: "create" })}>
              <Plus className="h-4 w-4" /> New chapter
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
              <Th>City</Th>
              <Th>Members</Th>
              <Th>Status</Th>
              <Th className="text-right">Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {rows.map((c) => (
              <Tr key={c.id}>
                <Td className="text-sm tabular-nums">{c.display_order}</Td>
                <Td>
                  <div className="font-medium text-heading">{c.name}</div>
                  {c.established_on && (
                    <div className="text-xs text-muted">
                      est. {new Date(c.established_on).getFullYear()}
                    </div>
                  )}
                </Td>
                <Td className="font-mono text-xs">{c.slug}</Td>
                <Td className="text-sm">
                  {c.city}
                  <div className="text-xs text-muted">{c.state}</div>
                </Td>
                <Td className="text-sm tabular-nums">{c.member_count}</Td>
                <Td>
                  <Badge tone={c.active ? "success" : "neutral"}>
                    {c.active ? "Active" : "Inactive"}
                  </Badge>
                </Td>
                <Td>
                  <div className="flex justify-end gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setMode({ kind: "edit", chapter: c })}
                      aria-label={`Edit ${c.name}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        if (
                          confirm(
                            `Delete ${c.name}? This is only possible if no members, committees, or lab tests are attached.`,
                          )
                        ) {
                          await deleteChapter(c.id);
                        }
                      }}
                      aria-label={`Delete ${c.name}`}
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
        title={mode.kind === "edit" ? "Edit chapter" : "New chapter"}
        description={
          mode.kind === "edit"
            ? `Update ${mode.chapter.name}.`
            : "Create a new chapter of UPCBMA."
        }
      >
        {mode.kind !== "closed" && (
          <ChapterForm
            chapter={mode.kind === "edit" ? mode.chapter : null}
            onDone={() => setMode({ kind: "closed" })}
          />
        )}
      </Dialog>
    </>
  );
}

function ChapterForm({
  chapter,
  onDone,
}: {
  chapter: Chapter | null;
  onDone: () => void;
}) {
  const isEdit = !!chapter;

  async function action(formData: FormData) {
    if (isEdit && chapter) {
      await updateChapter(chapter.id, formData);
    } else {
      await createChapter(formData);
    }
    onDone();
  }

  return (
    <form action={action} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Chapter name" htmlFor="name" required>
          <Input
            id="name"
            name="name"
            required
            defaultValue={chapter?.name ?? ""}
            placeholder="Lucknow Chapter"
          />
        </Field>
        <Field label="Slug" htmlFor="slug" required hint="URL-friendly ID (lowercase, dashes)">
          <Input
            id="slug"
            name="slug"
            required
            defaultValue={chapter?.slug ?? ""}
            placeholder="lucknow"
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="City" htmlFor="city" required>
          <Input
            id="city"
            name="city"
            required
            defaultValue={chapter?.city ?? ""}
          />
        </Field>
        <Field label="State" htmlFor="state">
          <Input
            id="state"
            name="state"
            defaultValue={chapter?.state ?? "Uttar Pradesh"}
          />
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Field label="Established" htmlFor="established_on">
          <Input
            id="established_on"
            name="established_on"
            type="date"
            defaultValue={chapter?.established_on ?? ""}
          />
        </Field>
        <Field label="Display order" htmlFor="display_order" hint="Lower = shown first">
          <Input
            id="display_order"
            name="display_order"
            type="number"
            min="0"
            defaultValue={String(chapter?.display_order ?? 0)}
          />
        </Field>
        <Field label="Accent colour" htmlFor="accent_color" hint="Hex, e.g. #2d6cb0">
          <Input
            id="accent_color"
            name="accent_color"
            defaultValue={chapter?.accent_color ?? ""}
            placeholder="#36454f"
          />
        </Field>
      </div>

      <Field label="Logo URL" htmlFor="logo_url" hint="Optional. Public URL to chapter logo.">
        <Input
          id="logo_url"
          name="logo_url"
          type="url"
          defaultValue={chapter?.logo_url ?? ""}
          placeholder="https://…/logo.png"
        />
      </Field>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="active"
          defaultChecked={chapter?.active ?? true}
          className="h-4 w-4 rounded-sm border-rule"
        />
        <span>Active</span>
      </label>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit">
          {isEdit ? "Save changes" : "Create chapter"}
        </Button>
      </div>
    </form>
  );
}
