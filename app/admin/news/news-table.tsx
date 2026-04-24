"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { EmptyState, Table, Tbody, Td, Th, Thead, Tr } from "@/components/ui/table";
import type { NewsItem } from "@/lib/db-types";
import { formatDate } from "@/lib/utils";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { createNews, deleteNews, updateNews } from "./actions";

type Mode =
  | { kind: "closed" }
  | { kind: "create" }
  | { kind: "edit"; item: NewsItem };

const TAG_TONE: Record<
  NewsItem["tag"],
  "info" | "warn" | "neutral" | "success"
> = {
  ANNOUNCEMENT: "info",
  EVENT: "success",
  NOTICE: "warn",
  UPDATE: "neutral",
};

export function NewsTable({ rows }: { rows: NewsItem[] }) {
  const [mode, setMode] = useState<Mode>({ kind: "closed" });

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted">
          {rows.length} item{rows.length === 1 ? "" : "s"} published.
        </p>
        <Button onClick={() => setMode({ kind: "create" })}>
          <Plus className="h-4 w-4" /> New post
        </Button>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No news items yet"
          description="Publish your first post to get started."
        />
      ) : (
        <Table>
          <Thead>
            <Tr>
              <Th>Date</Th>
              <Th>Tag</Th>
              <Th>Title</Th>
              <Th className="text-right">Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {rows.map((n) => (
              <Tr key={n.id}>
                <Td className="text-xs tabular-nums text-muted">
                  {formatDate(n.published_date)}
                </Td>
                <Td>
                  <Badge tone={TAG_TONE[n.tag]}>{n.tag}</Badge>
                </Td>
                <Td>
                  <div className="font-medium text-heading">{n.title}</div>
                  {n.body && (
                    <div className="line-clamp-2 max-w-xl text-xs text-muted">
                      {n.body}
                    </div>
                  )}
                </Td>
                <Td>
                  <div className="flex justify-end gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setMode({ kind: "edit", item: n })}
                      aria-label="Edit post"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        if (confirm("Delete this post? This cannot be undone.")) {
                          await deleteNews(n.id);
                        }
                      }}
                      aria-label="Delete post"
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
        title={mode.kind === "edit" ? "Edit post" : "New post"}
      >
        {mode.kind !== "closed" && (
          <NewsForm
            item={mode.kind === "edit" ? mode.item : null}
            onDone={() => setMode({ kind: "closed" })}
          />
        )}
      </Dialog>
    </>
  );
}

function NewsForm({
  item,
  onDone,
}: {
  item: NewsItem | null;
  onDone: () => void;
}) {
  const isEdit = !!item;

  async function action(formData: FormData) {
    if (isEdit && item) {
      await updateNews(item.id, formData);
    } else {
      await createNews(formData);
    }
    onDone();
  }

  return (
    <form action={action} className="space-y-4">
      <div className="grid grid-cols-[1fr_auto] gap-4">
        <Field label="Title" htmlFor="title" required>
          <Input
            id="title"
            name="title"
            required
            defaultValue={item?.title ?? ""}
          />
        </Field>
        <Field label="Tag" htmlFor="tag">
          <Select id="tag" name="tag" defaultValue={item?.tag ?? "ANNOUNCEMENT"}>
            <option value="ANNOUNCEMENT">ANNOUNCEMENT</option>
            <option value="EVENT">EVENT</option>
            <option value="NOTICE">NOTICE</option>
            <option value="UPDATE">UPDATE</option>
          </Select>
        </Field>
      </div>

      <Field label="Published date" htmlFor="published_date">
        <Input
          id="published_date"
          name="published_date"
          type="date"
          defaultValue={item?.published_date ?? ""}
        />
      </Field>

      <Field label="Body" htmlFor="body" hint="Plain text. Keep it short.">
        <Textarea
          id="body"
          name="body"
          rows={6}
          defaultValue={item?.body ?? ""}
        />
      </Field>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit">
          {isEdit ? "Save changes" : "Publish post"}
        </Button>
      </div>
    </form>
  );
}
