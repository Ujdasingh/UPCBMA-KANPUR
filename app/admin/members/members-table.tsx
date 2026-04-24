"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { EmptyState, Table, Tbody, Td, Th, Thead, Tr } from "@/components/ui/table";
import type { Member } from "@/lib/db-types";
import { formatDate } from "@/lib/utils";
import {
  KeyRound,
  Lock,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  Wand2,
} from "lucide-react";
import { useState } from "react";
import {
  createMember,
  deleteMember,
  resetMemberPassword,
  updateMember,
} from "./actions";

// Row shape: the server page augments each `Member` with the joined login
// email from auth.users.
type MemberRow = Member & { login_email: string | null };

type Mode =
  | { kind: "closed" }
  | { kind: "create" }
  | { kind: "edit"; member: MemberRow }
  | { kind: "reset"; member: MemberRow };

export function MembersTable({
  rows,
  canManageSuperAdmin,
  currentAuthUserId,
}: {
  rows: MemberRow[];
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
      (m.login_email ?? "").toLowerCase().includes(q) ||
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
              <Th>Name & contact</Th>
              <Th>Login</Th>
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
              const hasLogin = !!m.login_email;
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
                  <Td>
                    {hasLogin ? (
                      <div className="flex items-center gap-1.5 font-mono text-[11px] text-heading">
                        <KeyRound
                          className="h-3 w-3 text-muted"
                          strokeWidth={2}
                        />
                        {m.login_email}
                      </div>
                    ) : (
                      <span className="text-xs text-muted">—</span>
                    )}
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
                      {hasLogin && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setMode({ kind: "reset", member: m })}
                          aria-label={`Reset password for ${m.name}`}
                          title="Reset login password"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      )}
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
                                `Delete ${m.name}? ${hasLogin ? "Their login account will also be removed. " : ""}This cannot be undone.`,
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

      {/* Create / edit dialog */}
      <Dialog
        open={mode.kind === "create" || mode.kind === "edit"}
        onOpenChange={(o) => !o && setMode({ kind: "closed" })}
        title={mode.kind === "edit" ? "Edit member" : "New member"}
        description={
          mode.kind === "edit"
            ? `Update details for ${mode.member.name}.`
            : "Add a new member to the roster. Optionally give them a login account."
        }
      >
        {(mode.kind === "create" || mode.kind === "edit") && (
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

      {/* Password reset dialog */}
      <Dialog
        open={mode.kind === "reset"}
        onOpenChange={(o) => !o && setMode({ kind: "closed" })}
        title="Reset login password"
        description={
          mode.kind === "reset"
            ? `Set a new login password for ${mode.member.name} (${mode.member.login_email}).`
            : undefined
        }
      >
        {mode.kind === "reset" && (
          <ResetPasswordForm
            memberId={mode.member.id}
            onDone={() => setMode({ kind: "closed" })}
          />
        )}
      </Dialog>
    </>
  );
}

// ---------- Create/Edit form ----------

function generateTempPassword() {
  // 16-char strong temp password — alphanum + a couple of symbols.
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
  let out = "";
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  for (let i = 0; i < arr.length; i++) out += chars[arr[i]! % chars.length];
  return out;
}

function MemberForm({
  member,
  canAssignSuperAdmin,
  isSelf,
  onDone,
}: {
  member: MemberRow | null;
  canAssignSuperAdmin: boolean;
  isSelf: boolean;
  onDone: () => void;
}) {
  const isEdit = !!member;

  // Track the login email value so we can show the password field only when
  // it's populated. In edit mode, login is fixed and never editable here.
  const [loginEmail, setLoginEmail] = useState("");
  const [password, setPassword] = useState("");
  const wantsLogin = !isEdit && loginEmail.trim().length > 0;

  async function action(formData: FormData) {
    if (isEdit && member) {
      await updateMember(member.id, formData);
    } else {
      // The server expects `has_login` as a checkbox signal. Emulate it based
      // on whether a login email was entered.
      if (wantsLogin) formData.set("has_login", "on");
      await createMember(formData);
    }
    onDone();
  }

  return (
    <form action={action} className="space-y-5">
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

      {/* Read-only login info when editing an existing member with a login */}
      {isEdit && member?.login_email && (
        <div className="flex items-start gap-3 rounded-sm border border-border bg-surface p-3">
          <KeyRound className="mt-0.5 h-4 w-4 text-muted" strokeWidth={1.75} />
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">
              Login email (fixed identifier)
            </div>
            <div className="mt-0.5 break-all font-mono text-sm text-heading">
              {member.login_email}
            </div>
            <p className="mt-1 text-xs text-muted">
              Login emails can&rsquo;t be changed through this form. Use the{" "}
              <RotateCcw className="inline h-3 w-3" /> button on the row to
              reset the password.
            </p>
          </div>
        </div>
      )}

      <Field label="Name" htmlFor="name" required>
        <Input id="name" name="name" required defaultValue={member?.name ?? ""} />
      </Field>

      {/* BOTH email fields side-by-side on create. On edit, only contact email
          is shown here (login email is the read-only block above). */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field
          label="Contact email"
          htmlFor="email"
          required
          hint="Real inbox — for newsletters, notifications, and replies."
        >
          <Input
            id="email"
            name="email"
            type="email"
            required
            defaultValue={member?.email ?? ""}
            placeholder="name@gmail.com"
          />
        </Field>
        {!isEdit && (
          <Field
            label="Login email (optional)"
            htmlFor="login_email"
            hint="Leave empty for regular members. Fill in for anyone who will sign in at /login."
          >
            <Input
              id="login_email"
              name="login_email"
              type="email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              placeholder="admin@upcbmakanpur.com"
            />
          </Field>
        )}
      </div>

      {/* Password block — only when a login email was entered */}
      {wantsLogin && (
        <div className="rounded-sm border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-900">
            <KeyRound className="h-3.5 w-3.5" strokeWidth={2} />
            Login account setup
          </div>
          <p className="mt-1 text-xs text-amber-900/80">
            Creating a login for <strong>{loginEmail}</strong>. Set an initial
            password below — share it securely with the account owner.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
            <Field label="Initial password" htmlFor="initial_password" required>
              <Input
                id="initial_password"
                name="initial_password"
                type="text"
                minLength={8}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
              />
            </Field>
            <div className="flex items-end">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setPassword(generateTempPassword())}
              >
                <Wand2 className="h-4 w-4" /> Generate
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Field label="Phone" htmlFor="phone">
          <Input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={member?.phone ?? ""}
            placeholder="+91 98xxx xxxxx"
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
              : isEdit
              ? "Controls admin access."
              : wantsLogin
              ? "Applies to the login account you're creating."
              : "Without a login email above, role stays as 'member'."
          }
        >
          <Select
            id="role"
            name="role"
            defaultValue={member?.role ?? "member"}
            disabled={isSelf || (!isEdit && !wantsLogin)}
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
          {isEdit
            ? "Save changes"
            : wantsLogin
            ? "Add member + create login"
            : "Add member"}
        </Button>
      </div>
    </form>
  );
}

// ---------- Password reset form ----------

function ResetPasswordForm({
  memberId,
  onDone,
}: {
  memberId: string;
  onDone: () => void;
}) {
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await resetMemberPassword(memberId, password);
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field
        label="New password"
        htmlFor="new_password"
        required
        hint="At least 8 characters."
      >
        <Input
          id="new_password"
          name="new_password"
          type="text"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
        />
      </Field>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setPassword(generateTempPassword())}
        >
          <Wand2 className="h-4 w-4" /> Generate strong password
        </Button>
      </div>

      {err && (
        <div className="rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
          {err}
        </div>
      )}

      <p className="rounded-sm border border-border bg-surface p-3 text-xs leading-relaxed text-muted">
        The new password is immediately active. Share it securely with the
        account owner — no email is sent.
      </p>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Set new password"}
        </Button>
      </div>
    </form>
  );
}
