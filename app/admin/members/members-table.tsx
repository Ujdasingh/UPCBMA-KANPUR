"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { EmptyState, Table, Tbody, Td, Th, Thead, Tr } from "@/components/ui/table";
import type { Member } from "@/lib/db-types";
import type { Chapter } from "@/lib/chapters";
import { formatDate } from "@/lib/utils";
import {
  KeyRound,
  Lock,
  Mail,
  Pencil,
  Plus,
  RotateCcw,
  Send,
  ShieldCheck,
  ShieldOff,
  Trash2,
  UserPlus,
  Wand2,
} from "lucide-react";
import { useState } from "react";
import {
  createMember,
  deleteMember,
  inviteMember,
  resendInvite,
  resetMemberPassword,
  setMemberAdmin,
  updateMember,
} from "./actions";

// Row shape: the server page augments each `Member` with the joined login
// email from auth.users.
type MemberRow = Member & { login_email: string | null };

type Mode =
  | { kind: "closed" }
  | { kind: "create" }
  | { kind: "invite" }
  | { kind: "edit"; member: MemberRow }
  | { kind: "reset"; member: MemberRow };

type MemberCategoryOption = { id: string; name: string; slug: string };

export function MembersTable({
  rows,
  canManageSuperAdmin,
  currentAuthUserId,
  activeChapter,
  availableChapters,
  categoriesByChapter,
}: {
  rows: MemberRow[];
  canManageSuperAdmin: boolean;
  currentAuthUserId: string;
  activeChapter: Chapter | null;
  availableChapters: Chapter[];
  categoriesByChapter: Record<string, MemberCategoryOption[]>;
}) {
  const [mode, setMode] = useState<Mode>({ kind: "closed" });
  const [query, setQuery] = useState("");

  // Role filter — admins are technically rows in `members` too, but most of
  // the time you're managing actual association members, not staff. Default
  // to the "Members" view; flip to Admins/Staff to manage chapter+state
  // admins separately. "All" reveals everyone (super_admin still gated by
  // canManageSuperAdmin upstream).
  const [roleView, setRoleView] = useState<"member" | "admin" | "all">(
    "member",
  );
  const memberCount = rows.filter((m) => m.role === "member").length;
  const adminCount = rows.filter(
    (m) => m.role === "admin" || m.role === "super_admin",
  ).length;

  const filtered = rows.filter((m) => {
    // Role filter.
    if (roleView === "member" && m.role !== "member") return false;
    if (
      roleView === "admin" &&
      m.role !== "admin" &&
      m.role !== "super_admin"
    ) {
      return false;
    }

    // Search filter.
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
      {/* Role filter chips — separates regular members from admin/staff so
          they're not visually mixed in the same roster. */}
      <div className="mb-3 flex flex-wrap items-center gap-1">
        <RoleChip
          active={roleView === "member"}
          onClick={() => setRoleView("member")}
        >
          Members <span className="ml-1 text-muted">{memberCount}</span>
        </RoleChip>
        <RoleChip
          active={roleView === "admin"}
          onClick={() => setRoleView("admin")}
        >
          Admins / Staff <span className="ml-1 text-muted">{adminCount}</span>
        </RoleChip>
        <RoleChip
          active={roleView === "all"}
          onClick={() => setRoleView("all")}
        >
          All
        </RoleChip>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Input
          placeholder="Search by name, email, company, or ID…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-sm"
        />
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => setMode({ kind: "invite" })}
            disabled={availableChapters.length === 0}
            title="Send a sign-in invite by email — fastest path"
          >
            <UserPlus className="h-4 w-4" /> Invite
          </Button>
          <Button
            onClick={() => setMode({ kind: "create" })}
            disabled={availableChapters.length === 0}
            title="Manually create a row, with full control"
          >
            <Plus className="h-4 w-4" /> New
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={query ? "No matching members" : "No members yet"}
          description={
            query
              ? "Try a different search term."
              : "Use the buttons above to invite or add your first member."
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
                        <span className="rounded-sm border border-border bg-surface px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wider text-muted">
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
                          onClick={async () => {
                            if (
                              confirm(
                                `Re-send the invite to ${m.name} at ${m.email}? This generates a fresh temp password and emails it.`,
                              )
                            ) {
                              await resendInvite(m.id);
                            }
                          }}
                          aria-label={`Re-send invite to ${m.name}`}
                          title="Re-send invite email with a fresh temp password"
                        >
                          <Send className="h-3.5 w-3.5" />
                        </Button>
                      )}
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
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Button>
                      {/* Promote / revoke admin. Hidden for super_admins
                          (who must be managed via the super-admin tools)
                          and for self (avoid the "I demoted myself" trap). */}
                      {!isSelf && m.role !== "super_admin" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={async () => {
                            const isAdmin = m.role === "admin";
                            const next = !isAdmin;
                            const verb = next ? "Make" : "Revoke";
                            if (
                              confirm(
                                `${verb} admin rights for ${m.name}? ${
                                  next
                                    ? "They'll be able to access /admin and edit chapter data."
                                    : "They'll lose access to /admin."
                                }`,
                              )
                            ) {
                              await setMemberAdmin(m.id, next);
                            }
                          }}
                          aria-label={
                            m.role === "admin"
                              ? `Revoke admin from ${m.name}`
                              : `Make ${m.name} an admin`
                          }
                          title={
                            m.role === "admin"
                              ? "Revoke admin rights"
                              : "Make admin"
                          }
                          className={
                            m.role === "admin"
                              ? "text-amber-600 hover:bg-amber-50"
                              : ""
                          }
                        >
                          {m.role === "admin" ? (
                            <ShieldOff className="h-3.5 w-3.5" />
                          ) : (
                            <ShieldCheck className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      )}
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
                          <Trash2 className="h-3.5 w-3.5" /> Delete
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
            activeChapter={activeChapter}
            availableChapters={availableChapters}
            categoriesByChapter={categoriesByChapter}
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

      {/* Invite dialog */}
      <Dialog
        open={mode.kind === "invite"}
        onOpenChange={(o) => !o && setMode({ kind: "closed" })}
        title="Invite a member"
        description="Just name + their personal email. We auto-generate the @upcbma.com login and email them sign-in details. They'll be asked to set their own password on first sign-in."
      >
        {mode.kind === "invite" && (
          <InviteForm
            activeChapter={activeChapter}
            availableChapters={availableChapters}
            categoriesByChapter={categoriesByChapter}
            onDone={() => setMode({ kind: "closed" })}
          />
        )}
      </Dialog>
    </>
  );
}

// ---------- Invite form ----------

function InviteForm({
  activeChapter,
  availableChapters,
  categoriesByChapter,
  onDone,
}: {
  activeChapter: Chapter | null;
  availableChapters: Chapter[];
  categoriesByChapter: Record<string, MemberCategoryOption[]>;
  onDone: () => void;
}) {
  const [chapterId, setChapterId] = useState<string>(
    activeChapter?.id ?? availableChapters[0]?.id ?? "",
  );
  const [name, setName] = useState("");
  const [showOverride, setShowOverride] = useState(false);

  // Suggest a default member ID + login local-part from the name.
  const suggestedSlug = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s-]+/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const suggestedId = suggestedSlug.join("-").slice(0, 24);
  const suggestedLogin =
    suggestedSlug.length === 0
      ? ""
      : suggestedSlug.length === 1
        ? suggestedSlug[0]
        : `${suggestedSlug[0]}.${suggestedSlug[suggestedSlug.length - 1]}`;

  const cats = chapterId ? categoriesByChapter[chapterId] ?? [] : [];

  return (
    <form action={inviteMember} className="space-y-4" onSubmit={() => onDone()}>
      <Field label="Member ID" htmlFor="i_id" required>
        <Input
          id="i_id"
          name="id"
          required
          placeholder={suggestedId || "unique-id"}
          defaultValue={suggestedId}
          key={suggestedId}
        />
      </Field>

      <Field label="Full name" htmlFor="i_name" required>
        <Input
          id="i_name"
          name="name"
          required
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Aman Sharma"
        />
      </Field>

      <Field
        label="Personal email"
        htmlFor="i_email"
        hint="The invite is sent here. This is also their contact email."
        required
      >
        <Input
          id="i_email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="aman@his-company.com"
        />
      </Field>

      <Field label="Phone (optional)" htmlFor="i_phone">
        <Input id="i_phone" name="phone" type="tel" autoComplete="tel" />
      </Field>

      <Field label="Company (optional)" htmlFor="i_company">
        <Input id="i_company" name="company" autoComplete="organization" />
      </Field>

      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Chapter" htmlFor="i_chapter">
          <Select
            id="i_chapter"
            name="chapter_id"
            value={chapterId}
            onChange={(e) => setChapterId(e.target.value)}
          >
            {availableChapters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Category (optional)" htmlFor="i_cat">
          <Select id="i_cat" name="category_id" defaultValue="">
            <option value="">None</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="rounded-sm border border-dashed border-border bg-surface p-3 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-muted">
            Auto-generated login:{" "}
            <code className="font-mono text-heading">
              {suggestedLogin || "—"}
              @upcbma.com
            </code>
          </span>
          <button
            type="button"
            onClick={() => setShowOverride((s) => !s)}
            className="text-[11px] font-medium text-heading hover:text-hover"
          >
            {showOverride ? "use suggested" : "override…"}
          </button>
        </div>
        {showOverride && (
          <div className="mt-2">
            <Input
              name="login_email"
              placeholder="custom-login@upcbma.com"
              autoComplete="off"
            />
            <p className="mt-1 text-[11px] text-muted">
              Must end with @upcbma.com. Leave blank to use the auto suggestion.
            </p>
          </div>
        )}
      </div>

      <div className="flex items-start gap-2 rounded-sm border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
        <Mail className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
        <span>
          A 12-character temporary password is generated and emailed to the
          personal address above. The member will be required to set their own
          password the first time they sign in.
        </span>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit">
          <Send className="h-3.5 w-3.5" /> Send invite
        </Button>
      </div>
    </form>
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
  activeChapter,
  availableChapters,
  categoriesByChapter,
  onDone,
}: {
  member: MemberRow | null;
  canAssignSuperAdmin: boolean;
  isSelf: boolean;
  activeChapter: Chapter | null;
  availableChapters: Chapter[];
  categoriesByChapter: Record<string, MemberCategoryOption[]>;
  onDone: () => void;
}) {
  const isEdit = !!member;

  // Which chapter this member is being added to — defaults to the sidebar's
  // active chapter, otherwise first in the list.
  const initialChapterId =
    activeChapter?.id ?? availableChapters[0]?.id ?? "";
  const [selectedChapterId, setSelectedChapterId] =
    useState(initialChapterId);
  const selectedChapter = availableChapters.find(
    (c) => c.id === selectedChapterId,
  );
  const categories = categoriesByChapter[selectedChapterId] ?? [];

  // Track the login email value so we can show the password field only when
  // it's populated. In edit mode, login is fixed and never editable here.
  const [loginEmail, setLoginEmail] = useState("");
  const [password, setPassword] = useState("");
  const wantsLogin = !isEdit && loginEmail.trim().length > 0;

  // Auto-suggest chapter-scoped login email for new admins, based on whichever
  // chapter is currently selected in the form (not the sidebar).
  const loginSuggestion =
    !isEdit && selectedChapter
      ? `admin.${selectedChapter.slug}@upcbma.com`
      : "admin@upcbma.com";

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
        <>
          <Field
            label="Chapter"
            htmlFor="chapter_id"
            required
            hint="Which chapter this member is being added to."
          >
            <Select
              id="chapter_id"
              name="chapter_id"
              value={selectedChapterId}
              onChange={(e) => setSelectedChapterId(e.target.value)}
              required
            >
              {availableChapters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Member ID"
            htmlFor="id"
            required
            hint="Short human-readable ID, e.g. UPCBMA-001"
          >
            <Input id="id" name="id" required placeholder="UPCBMA-001" />
          </Field>

          {/* Per-chapter category dropdown — populated based on the selected chapter */}
          {categories.length > 0 && (
            <Field
              label="Chapter category"
              htmlFor="category_id"
              hint={`Category within ${selectedChapter?.name ?? "this chapter"}.`}
            >
              <Select
                id="category_id"
                name="category_id"
                defaultValue=""
                key={selectedChapterId}
              >
                <option value="">— None —</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}
        </>
      )}

      {/* Read-only login info when editing an existing member with a login */}
      {isEdit && member?.login_email && (
        <div className="flex items-start gap-3 rounded-sm border border-border bg-surface p-3">
          <KeyRound className="mt-0.5 h-4 w-4 text-muted" strokeWidth={1.75} />
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">
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
          label={isEdit ? "Contact email" : "Contact email (optional)"}
          htmlFor="email"
          required={isEdit}
          hint={
            isEdit
              ? "Real inbox — for newsletters, notifications, and replies."
              : "Real inbox if you have it. Leave blank to auto-generate a john.doe@upcbma.com placeholder the member can update later."
          }
        >
          <Input
            id="email"
            name="email"
            type="email"
            required={isEdit}
            defaultValue={member?.email ?? ""}
            placeholder={isEdit ? "name@gmail.com" : "leave blank to auto-generate"}
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
              placeholder={loginSuggestion}
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

/**
 * Compact pill button used for the role filter chip row above the members
 * table. Matches the SectionTabs styling so the page reads as one consistent
 * surface even though tabs (Roster/Categories) come from a separate component.
 */
function RoleChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "inline-flex h-8 items-center rounded-sm border px-3 text-xs font-medium transition-colors " +
        (active
          ? "border-heading bg-heading text-white"
          : "border-border bg-bg text-muted hover:border-heading hover:text-heading")
      }
    >
      {children}
    </button>
  );
}
