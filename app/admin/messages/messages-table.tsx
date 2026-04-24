"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Select } from "@/components/ui/input";
import { EmptyState, Table, Tbody, Td, Th, Thead, Tr } from "@/components/ui/table";
import type { ContactMessage } from "@/lib/db-types";
import { formatDateTime } from "@/lib/utils";
import { Eye, Trash2 } from "lucide-react";
import { useState } from "react";
import { deleteMessage, updateMessageStatus } from "./actions";

const STATUS_TONE: Record<
  ContactMessage["status"],
  "warn" | "info" | "success" | "neutral"
> = {
  new: "warn",
  read: "info",
  replied: "success",
  archived: "neutral",
};

const STATUSES: ContactMessage["status"][] = [
  "new",
  "read",
  "replied",
  "archived",
];

export function MessagesTable({ rows }: { rows: ContactMessage[] }) {
  const [detail, setDetail] = useState<ContactMessage | null>(null);
  const [filter, setFilter] = useState<ContactMessage["status"] | "all">(
    "all",
  );

  const filtered =
    filter === "all" ? rows : rows.filter((r) => r.status === filter);

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-1">
          {(["all", ...STATUSES] as const).map((s) => {
            const count =
              s === "all"
                ? rows.length
                : rows.filter((r) => r.status === s).length;
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
                {s} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={filter === "all" ? "No messages yet" : `No ${filter} messages`}
          description="Incoming contact form submissions appear here."
        />
      ) : (
        <Table>
          <Thead>
            <Tr>
              <Th>Received</Th>
              <Th>From</Th>
              <Th>Subject</Th>
              <Th>Message</Th>
              <Th>Status</Th>
              <Th className="text-right">Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {filtered.map((m) => (
              <Tr
                key={m.id}
                className={m.status === "new" ? "font-medium" : ""}
              >
                <Td className="text-xs tabular-nums text-muted">
                  {formatDateTime(m.created_at)}
                </Td>
                <Td>
                  <div className="font-medium text-heading">{m.name}</div>
                  <div className="text-xs text-muted">{m.email}</div>
                </Td>
                <Td className="text-sm">{m.subject ?? "—"}</Td>
                <Td>
                  <div className="line-clamp-1 max-w-md text-xs text-muted">
                    {m.message}
                  </div>
                </Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <Badge tone={STATUS_TONE[m.status]}>{m.status}</Badge>
                    <Select
                      value={m.status}
                      onChange={async (e) => {
                        await updateMessageStatus(
                          m.id,
                          e.target.value as ContactMessage["status"],
                        );
                      }}
                      className="!h-7 !py-0 text-xs"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </Select>
                  </div>
                </Td>
                <Td>
                  <div className="flex justify-end gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        setDetail(m);
                        if (m.status === "new") {
                          await updateMessageStatus(m.id, "read");
                        }
                      }}
                      aria-label="View message"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        if (confirm("Delete this message? This cannot be undone.")) {
                          await deleteMessage(m.id);
                        }
                      }}
                      aria-label="Delete message"
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
        title={detail?.subject ?? "Message"}
        description={
          detail ? `From ${detail.name} · ${detail.email}` : undefined
        }
      >
        {detail && (
          <div className="space-y-4">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-xs uppercase tracking-[0.12em] text-muted">
                Received
              </dt>
              <dd className="tabular-nums">
                {formatDateTime(detail.created_at)}
              </dd>
              {detail.phone && (
                <>
                  <dt className="text-xs uppercase tracking-[0.12em] text-muted">
                    Phone
                  </dt>
                  <dd>{detail.phone}</dd>
                </>
              )}
              <dt className="text-xs uppercase tracking-[0.12em] text-muted">
                Status
              </dt>
              <dd>
                <Badge tone={STATUS_TONE[detail.status]}>
                  {detail.status}
                </Badge>
              </dd>
            </dl>
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                Message
              </h3>
              <p className="whitespace-pre-wrap rounded-sm border border-rule bg-surface p-4 text-sm">
                {detail.message}
              </p>
            </div>
            <div className="flex justify-between gap-2 pt-2">
              <a
                href={`mailto:${detail.email}?subject=Re:%20${encodeURIComponent(
                  detail.subject ?? "your message",
                )}`}
                className="inline-flex h-10 items-center rounded-sm border border-rule bg-bg px-4 text-sm font-medium text-heading hover:border-heading hover:bg-surface"
              >
                Reply by email
              </a>
              <Button variant="ghost" onClick={() => setDetail(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
}
