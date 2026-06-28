"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, Filter, Save, Search, X } from "lucide-react";
import type { Permission } from "@/lib/permissions";
import { setMemberPermissions } from "./actions";
import { cn } from "@/lib/utils";

/**
 * Two-pane permissions admin:
 *
 *   Left:  searchable member list (one row per member). Click → load
 *          their current grants into the right pane.
 *   Right: matrix of every permission, grouped by area, with a
 *          checkbox per key. Includes preset chips at the top
 *          ("Lab desk", "Editor", "Office") that flip the relevant
 *          checkboxes in one click. Save persists; Cancel reverts.
 *
 * Server source-of-truth comes via the parent page; this component
 * never re-fetches — relying on the parent's revalidatePath after a
 * successful save.
 */

export type MemberLite = {
  id: string;
  name: string;
  company: string | null;
  role: string;
  /** Snapshot of the member's currently granted permission keys. */
  grants: string[];
  /** Whether the member has an active committee appointment today. */
  hasActiveCommittee: boolean;
};

type Preset = { label: string; keys: string[] };

const PRESETS: Preset[] = [
  {
    label: "Lab desk",
    keys: ["lab.edit", "bookings.manage"],
  },
  {
    label: "Editor",
    keys: [
      "news.edit",
      "agendas.edit",
      "agendas.approve",
      "events.edit",
      "messages.manage",
    ],
  },
  {
    label: "Office",
    keys: ["office.edit", "messages.manage"],
  },
  {
    label: "Membership",
    keys: ["members.edit", "members.invite"],
  },
];

export function PermissionsForm({
  members,
  permissions,
  callerIsSuper,
}: {
  members: MemberLite[];
  permissions: Permission[];
  /** Hides super.* keys from non-super admins. */
  callerIsSuper: boolean;
}) {
  const [activeId, setActiveId] = useState<string | null>(
    members[0]?.id ?? null,
  );
  const [search, setSearch] = useState("");
  const filteredMembers = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return members;
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.company ?? "").toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q),
    );
  }, [members, search]);

  const active = members.find((m) => m.id === activeId) ?? null;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
      <aside className="rounded-sm border border-border bg-bg">
        <div className="border-b border-border p-3">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted"
              strokeWidth={2}
            />
            <input
              type="text"
              placeholder="Search members…"
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              className="block w-full rounded-sm border border-border bg-bg py-2 pl-8 pr-3 text-sm focus-visible:border-heading focus-visible:outline-none"
            />
          </div>
        </div>
        <ul className="max-h-[70vh] overflow-y-auto">
          {filteredMembers.map((m) => {
            const isActive = m.id === activeId;
            return (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => setActiveId(m.id)}
                  className={cn(
                    "block w-full px-4 py-3 text-left transition-colors",
                    isActive
                      ? "bg-surface"
                      : "hover:bg-surface/60",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium text-heading">
                      {m.name}
                    </span>
                    <RoleBadge role={m.role} />
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-2 text-xs text-muted">
                    <span className="truncate">{m.company ?? "—"}</span>
                    <span className="shrink-0">
                      {m.grants.length} grant{m.grants.length === 1 ? "" : "s"}
                    </span>
                  </div>
                </button>
              </li>
            );
          })}
          {filteredMembers.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-muted">
              No members match "{search}".
            </li>
          )}
        </ul>
      </aside>

      <section className="rounded-sm border border-border bg-bg p-5">
        {active ? (
          <Editor
            key={active.id}
            member={active}
            permissions={permissions}
            callerIsSuper={callerIsSuper}
          />
        ) : (
          <p className="text-sm text-muted">Select a member from the list.</p>
        )}
      </section>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  if (role === "super_admin") {
    return (
      <span className="rounded-sm border border-purple-200 bg-purple-50 px-1.5 py-0.5 text-[11px] font-semibold uppercase text-purple-700">
        Super
      </span>
    );
  }
  if (role === "admin") {
    return (
      <span className="rounded-sm border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[11px] font-semibold uppercase text-blue-700">
        Admin
      </span>
    );
  }
  return null;
}

function Editor({
  member,
  permissions,
  callerIsSuper,
}: {
  member: MemberLite;
  permissions: Permission[];
  callerIsSuper: boolean;
}) {
  const initial = useMemo(() => new Set(member.grants), [member.grants]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initial));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const visiblePerms = permissions.filter(
    (p) => callerIsSuper || p.area !== "super",
  );
  const grouped = useMemo(() => {
    const out: Record<string, Permission[]> = {};
    for (const p of visiblePerms) {
      out[p.area] = out[p.area] ?? [];
      out[p.area]!.push(p);
    }
    return out;
  }, [visiblePerms]);

  const dirty =
    selected.size !== initial.size ||
    [...selected].some((k) => !initial.has(k));

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setSavedAt(null);
  }

  function applyPreset(p: Preset) {
    setSelected((prev) => {
      const next = new Set(prev);
      const allOn = p.keys.every((k) => next.has(k));
      if (allOn) p.keys.forEach((k) => next.delete(k));
      else p.keys.forEach((k) => next.add(k));
      return next;
    });
    setSavedAt(null);
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await setMemberPermissions(member.id, [...selected]);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSavedAt(Date.now());
    });
  }

  function reset() {
    setSelected(new Set(initial));
    setError(null);
    setSavedAt(null);
  }

  return (
    <div>
      <header className="border-b border-border pb-4">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <h2 className="!text-lg !tracking-tight">{member.name}</h2>
            <p className="text-xs text-muted">
              {member.company ?? "No company"}
              {" · "}
              <code className="font-mono text-[11px]">{member.id}</code>
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <RoleBadge role={member.role} />
          </div>
        </div>
        {member.role === "super_admin" || member.role === "admin" ? (
          <p className="mt-3 rounded-sm border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <Filter className="mr-1 inline h-3 w-3" strokeWidth={2} />
            This member's role already grants {member.role === "super_admin" ? "every permission" : "every permission except Super"}. Direct grants below are additive but redundant — useful only if you later demote them.
          </p>
        ) : null}
        {member.hasActiveCommittee && (
          <p className="mt-3 rounded-sm border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
            <Check className="mr-1 inline h-3 w-3" strokeWidth={2} />
            Active committee appointment — automatically grants the content tier (news, agendas, events, committee, messages) without explicit checkboxes below.
          </p>
        )}
      </header>

      <div className="mt-5 flex flex-wrap gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
          Quick presets:
        </span>
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => applyPreset(p)}
            className="inline-flex items-center gap-1 rounded-sm border border-border bg-surface px-2.5 py-1 text-xs font-medium text-heading hover:border-heading"
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-6">
        {Object.entries(AREA_LABELS).map(([area, label]) => {
          const list = grouped[area] ?? [];
          if (list.length === 0) return null;
          return (
            <section key={area}>
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                {label}
              </h3>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {list.map((p) => {
                  const checked = selected.has(p.key);
                  return (
                    <li key={p.key}>
                      <label
                        className={cn(
                          "flex cursor-pointer items-start gap-2 rounded-sm border bg-bg px-3 py-2.5 text-sm transition-colors",
                          checked
                            ? "border-heading bg-surface"
                            : "border-border hover:border-rule hover:bg-surface/60",
                        )}
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5 h-4 w-4"
                          checked={checked}
                          onChange={() => toggle(p.key)}
                        />
                        <span className="flex-1">
                          <span className="font-medium text-heading">
                            {p.label}
                          </span>
                          <span className="ml-1 font-mono text-[11px] text-muted">
                            {p.key}
                          </span>
                          {p.description && (
                            <span className="mt-0.5 block text-xs text-muted">
                              {p.description}
                            </span>
                          )}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      <div className="mt-8 flex items-center justify-between border-t border-border pt-4">
        <div className="text-xs text-muted">
          {dirty ? (
            <span>{selected.size} selected · unsaved changes</span>
          ) : savedAt ? (
            <span className="text-emerald-700">
              Saved {new Date(savedAt).toLocaleTimeString()}
            </span>
          ) : (
            <span>{selected.size} selected</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {dirty && (
            <button
              type="button"
              onClick={reset}
              className="inline-flex h-9 items-center gap-1.5 rounded-sm border border-border bg-bg px-3 text-sm font-medium text-text hover:border-heading"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2} />
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={save}
            disabled={!dirty || pending}
            className="inline-flex h-9 items-center gap-1.5 rounded-sm bg-heading px-4 text-sm font-medium text-white transition-colors hover:bg-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" strokeWidth={2} />
            {pending ? "Saving…" : "Save grants"}
          </button>
        </div>
      </div>
      {error && (
        <p className="mt-3 rounded-sm border border-red-200 bg-red-50 p-3 text-xs text-red-900">
          {error}
        </p>
      )}
    </div>
  );
}

const AREA_LABELS: Record<string, string> = {
  lab: "Lab",
  content: "Content",
  committee: "Committee",
  members_office: "Members & Office",
  super: "Super-admin",
};
