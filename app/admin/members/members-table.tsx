"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { EmptyState, Table, Tbody, Td, Th, Thead, Tr } from "@/components/ui/table";
import type { Member } from "@/lib/db-types";
import { formatDate } from "@/lib/utils";
import { Lock, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { createMember, deleteMember, updateMember } from "./actions";

type Mode =
  | { kind: "closed" }
  | { kind: "create" }
  | { kind: "edit"; member: Member };

export function MembersTable({
  rows,
  canManageSuperAdmin,
  currentAuthUserId,
}: {
  rows: Member[];
  canManageSuperAdmin: boolean;
  currentAuthUserId: string;
}) {
  const [mode, setMode] = useState<Mode>({ kind: "closed" });
  const [query, setQuery] = useState("");

  const filtered = rows.filter((m) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      (m.company ?? "").toLowerCase().includes(q) ||
      m.id.toLowerCase().includes(q)
    );
  });

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <Input
          placeholder="Search by name, email, company, or ID…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-sm"
        />
        <Button onClick={() => setMode({ kind: "create" })}>
          <Plus className="h-4 w-4" /> New member
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={query ? "No matching members" : "No members yet"}
          description={
            query
              ? "Try a different search term."
              : "Add your first member to get started."
          }
          action={
            !query && (
              <Button onClick={() => setMode({ kind: "create" })}>
                <Plus className="h-4 w-4" /> New member
              </Button>
            )
          }
        />
      ) : (
        <Table>
          <Thead>
            <Tr>
              <Th>ID</Th>
              <Th>Name</Th>
              <Th>Company</Th>
              <Th>Category</Th>
              <Th>Role</Th>
              <Th>Status</Th>
              <Th>Since</Th>
              <Th className="text-right">Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {filtered.map((m) => {
              const isSelf = m.auth_user_id === currentAuthUserId;
              const isSuper = m.role === "super_admin";
              return (
                <Tr key={m.id}>
                  <Td className="font-mono text-xs">{m.id}</Td>
                  <Td>
                    <div className="flex items-center gap-2 font-medium text-heading">
                      {m.name}
                      {isSelf && (
                        <span className="rounded-sm border border-border bg-surface px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted">
                          you
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted">{m.email}</div>
                  </Td>
                  <Td className="text-sm">{m.company ?? "—"}</Td>
                  <Td>
                    <Badge tone={m.category === "Executive" ? "info" : "neutral"}>
                      {m.category}
                    </Badge>
                  </Td>
                  <Td>
                    <Badge
                      tone={
                        isSuper
                          ? "danger"
                          : m.role === "admin"
                          ? "warn"
                          : "neutral"
                      }
                    >
                      {m.role}
                    </Badge>
                  </Td>
                  <Td>
                    <Badge tone={m.active ? "success" : "neutral"}>
                      {m.active ? "Active" : "Inactive"}
                    </Badge>
                  </Td>
                  <Td className="text-xs text-muted tabular-nums">
                    {formatDate(m.member_since)}
                  </Td>
                  <Td>
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setMode({ kind: "edit", member: m })}
                        aria-label={`Edit ${m.name}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {isSelf ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled
                          aria-label="Cannot delete your own account"
                          title="You cannot delete your own account"
                        >
                          <Lock className="h-3.5 w-3.5 text-muted" />
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={async () => {
                            if (
                              confirm(
                                `Delete ${m.name}? This removes committee appointments too. This cannot be undone.`,
                              )
                            ) {
                              await deleteMember(m.id);
                            }
                          }}
                          aria-label={`Delete ${m.name}`}
                          className="text-danger hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      )}

      <Dialog
        open={mode.kind !== "closed"}
        onOpenChange={(o) => !o && setMode({ kind: "closed" })}
        title={mode.kind === "edit" ? "Edit member" : "New member"}
        description={
          mode.kind === "edit"
            ? `Update details for ${mode.member.name}.`
            : "Add a new member to the roster."
        }
      >
        {mode.kind !== "closed" && (
          <MemberForm
            member={mode.kind === "edit" ? mode.member : null}
            canAssignSuperAdmin={canManageSuperAdmin}
            isSelf={
              mode.kind === "edit" &&
              mode.member.auth_user_id === currentAuthUserId
            }
            onDone={() => setMode({ kind: "closed" })}
          />
        )}
      </Dialog>
    </>
  );
}

function MemberForm({
  member,
  canAssignSuperAdmin,
  isSelf,
  onDone,
}: {
  member: Member | null;
  canAssignSuperAdmin: boolean;
  isSelf: boolean;
  onDone: () => void;
}) {
  const isEdit = !!member;

  async function action(formData: FormData) {
    if (isEdit && member) {
      await updateMember(member.id, formData);
    } else {
      await createMember(formData);
    }
    onDone();
  }

  return (
    <form action={action} className="space-y-4">
      {!isEdit && (
        <Field
          label="Member ID"
          htmlFor="id"
          required
          hint="Short human-readable ID, e.g. UPCBMA-001"
        >
          <Input id="id" name="id" required placeholder="UPCBMA-001" />
        </Field>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Field label="Name" htmlFor="name" required>
          <Input
            id="name"
            name="name"
            required
            defaultValue={member?.name ?? ""}
          />
        </Field>
        <Field label="Email" htmlFor="email" required>
          <Input
            id="email"
            name="email"
            type="email"
            required
            defaultValue={member?.email ?? ""}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Phone" htmlFor="phone">
          <Input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={member?.phone ?? ""}
            placeholder="+91 98765 43210"
          />
        </Field>
        <Field label="Company" htmlFor="company">
          <Input
            id="company"
            name="company"
            defaultValue={member?.company ?? ""}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Category" htmlFor="category">
          <Select
            id="category"
            name="category"
            defaultValue={member?.category ?? "Member"}
          >
            <option value="Member">Member</option>
            <option value="Executive">Executive</option>
          </Select>
        </Field>
        <Field
          label="Role"
          htmlFor="role"
          hint={
            isSelf
              ? "Your own role is locked — ask another super_admin to change it."
              : "Controls admin access"
          }
        >
          <Select
            id="role"
            name="role"
            defaultValue={member?.role ?? "member"}
            disabled={isSelf}
          >
            <option value="member">member</option>
            <option value="admin">admin</option>
            {canAssignSuperAdmin && (
              <option value="super_admin">super_admin</option>
            )}
          </Select>
        </Field>
      </div>

      <Field label="Member since" htmlFor="member_since">
        <Input
          id="member_since"
          name="member_since"
          type="date"
          defaultValue={member?.member_since ?? ""}
        />
      </Field>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="active"
          defaultChecked={member?.active ?? true}
          className="h-4 w-4 rounded-sm border-rule"
        />
        <span>Active on roster</span>
      </label>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit">
          {isEdit ? "Save changes" : "Add member"}
        </Button>
      </div>
    </form>
  );
}
