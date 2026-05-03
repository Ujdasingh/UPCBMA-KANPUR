"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  CornerDownRight,
  Pencil,
  Send,
  Trash2,
  X,
  Check,
  MessageSquare,
} from "lucide-react";
import { Avatar } from "./avatar";
import { cn } from "@/lib/utils";
import {
  deleteAgendaComment,
  editAgendaComment,
  postAgendaComment,
} from "@/app/agendas/engagement-actions";
import type { AgendaComment } from "@/lib/agenda-engagement";

/**
 * Threaded-but-flat comment list for an agenda.
 *
 * Renders the existing comments (with the member's avatar + name +
 * company), an inline composer for signed-in members, and per-comment
 * edit/delete affordances when the viewer is allowed.
 *
 * Optimistic where it makes sense: posting a new comment slots it into
 * the list immediately; the next page revalidate corrects any drift.
 * Edit and delete are server-confirmed because changing someone's words
 * out from under them is worse than a brief spinner.
 */
export function AgendaComments({
  agendaId,
  signInHref,
  initial,
  signedInMemberId,
}: {
  agendaId: string;
  /** /login URL with ?next= preserving the current agenda. */
  signInHref: string;
  initial: AgendaComment[];
  /** When set, the composer renders. Falsy → sign-in nudge instead. */
  signedInMemberId?: string;
}) {
  const [comments, setComments] = useState<AgendaComment[]>(initial);

  // Group replies under their parents so the UI can render a single root
  // list with a flat reply tail under each. We deliberately stay one level
  // deep — deep threading on a small membership site adds noise.
  const { roots, repliesByParent } = useMemo(() => {
    const roots: AgendaComment[] = [];
    const repliesByParent = new Map<string, AgendaComment[]>();
    for (const c of comments) {
      if (c.parent_id) {
        const list = repliesByParent.get(c.parent_id) ?? [];
        list.push(c);
        repliesByParent.set(c.parent_id, list);
      } else {
        roots.push(c);
      }
    }
    return { roots, repliesByParent };
  }, [comments]);

  function handleNew(c: AgendaComment) {
    setComments((cur) => [...cur, c]);
  }
  function handleEdit(id: string, body: string) {
    setComments((cur) =>
      cur.map((c) => (c.id === id ? { ...c, body, edited: true } : c)),
    );
  }
  function handleDelete(id: string) {
    setComments((cur) =>
      cur.filter((c) => c.id !== id && c.parent_id !== id),
    );
  }

  return (
    <section id="comments" className="scroll-mt-24">
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <MessageSquare className="h-4 w-4 text-muted" strokeWidth={1.75} />
        <h2 className="!text-lg !tracking-tight">
          Member discussion
          <span className="ml-2 text-xs font-normal text-muted">
            ({comments.length})
          </span>
        </h2>
      </div>

      {roots.length === 0 ? (
        <div className="mt-6 rounded-sm border border-dashed border-border bg-surface p-6 text-center text-sm text-muted">
          No comments yet — be the first to weigh in.
        </div>
      ) : (
        <ul className="mt-6 space-y-6">
          {roots.map((c) => {
            const replies = repliesByParent.get(c.id) ?? [];
            return (
              <li key={c.id}>
                <CommentItem
                  comment={c}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onReply={handleNew}
                  isSelf={c.member_id === signedInMemberId}
                  signedInMemberId={signedInMemberId}
                  agendaId={agendaId}
                  signInHref={signInHref}
                />
                {replies.length > 0 && (
                  <ul className="mt-4 space-y-4 border-l-2 border-border pl-5">
                    {replies.map((r) => (
                      <li key={r.id}>
                        <CommentItem
                          comment={r}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                          onReply={handleNew}
                          isSelf={r.member_id === signedInMemberId}
                          signedInMemberId={signedInMemberId}
                          agendaId={agendaId}
                          signInHref={signInHref}
                          isReply
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-8 border-t border-border pt-6">
        {signedInMemberId ? (
          <Composer
            agendaId={agendaId}
            onPosted={handleNew}
            signedInMemberId={signedInMemberId}
          />
        ) : (
          <div className="rounded-sm border border-border bg-surface p-4 text-sm text-muted">
            <Link
              href={signInHref}
              className="font-semibold text-heading no-underline hover:underline"
            >
              Sign in
            </Link>{" "}
            to join the discussion. Comments are visible to everyone but
            only members can post.
          </div>
        )}
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Composer — sign-in members only
// ──────────────────────────────────────────────────────────────────────

function Composer({
  agendaId,
  onPosted,
  signedInMemberId,
  parentId,
  compact,
  onCancel,
}: {
  agendaId: string;
  onPosted: (c: AgendaComment) => void;
  signedInMemberId: string;
  /** When set, the post becomes a reply under this parent comment. */
  parentId?: string;
  /** Reply composers render tighter — used inline under a comment. */
  compact?: boolean;
  /** Optional cancel handler — closes the inline reply form. */
  onCancel?: () => void;
}) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLTextAreaElement>(null);

  // Reply composers should grab focus when they appear so the user can
  // start typing immediately.
  useEffect(() => {
    if (compact) ref.current?.focus();
  }, [compact]);

  function submit() {
    const trimmed = body.trim();
    if (!trimmed) {
      setError("Write something first.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await postAgendaComment(agendaId, trimmed, parentId ?? null);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      const now = new Date().toISOString();
      onPosted({
        id: `pending-${now}`,
        agenda_id: agendaId,
        member_id: signedInMemberId,
        parent_id: parentId ?? null,
        body: trimmed,
        posted_at: now,
        edited: false,
        member: null,
        canEdit: true,
        canDelete: true,
      });
      setBody("");
      if (compact && onCancel) {
        // Reply done — collapse the inline composer.
        onCancel();
      } else {
        ref.current?.focus();
      }
    });
  }

  return (
    <div>
      {!compact && (
        <label
          htmlFor="agenda-comment"
          className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-muted"
        >
          Add a comment
        </label>
      )}
      <textarea
        ref={ref}
        id={compact ? undefined : "agenda-comment"}
        value={body}
        onChange={(e) => setBody(e.currentTarget.value)}
        placeholder={
          compact
            ? "Write your reply…"
            : "Share what you know, or ask the chapter what they think."
        }
        rows={compact ? 2 : 3}
        maxLength={4000}
        className={cn(
          "block w-full rounded-sm border border-border bg-bg px-3 py-2 text-sm focus-visible:border-heading focus-visible:outline-none",
          !compact && "mt-2",
        )}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            submit();
          }
          if (e.key === "Escape" && compact && onCancel) {
            onCancel();
          }
        }}
      />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted">
          ⌘+Enter to post · {body.length}/4000
        </p>
        <div className="flex gap-2">
          {compact && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-border bg-bg px-3 text-xs font-medium text-text hover:border-heading hover:text-heading"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={submit}
            disabled={pending || !body.trim()}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-sm bg-heading text-white transition-colors hover:bg-hover disabled:cursor-not-allowed disabled:opacity-50",
              compact ? "h-8 px-3 text-xs font-medium" : "h-9 px-4 text-sm font-medium",
            )}
          >
            <Send className="h-3.5 w-3.5" strokeWidth={2} />
            {pending ? "Posting…" : compact ? "Reply" : "Post comment"}
          </button>
        </div>
      </div>
      {error && (
        <p className="mt-2 text-xs text-danger">{error}</p>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Comment item — display + inline edit + delete
// ──────────────────────────────────────────────────────────────────────

function CommentItem({
  comment,
  onEdit,
  onDelete,
  onReply,
  isSelf,
  signedInMemberId,
  agendaId,
  signInHref,
  isReply,
}: {
  comment: AgendaComment;
  onEdit: (id: string, body: string) => void;
  onDelete: (id: string) => void;
  /** Called when a successful reply is posted; same as onPosted in parent. */
  onReply: (c: AgendaComment) => void;
  isSelf: boolean;
  signedInMemberId?: string;
  agendaId: string;
  signInHref: string;
  /** Tighter rendering for nested replies — no nested reply button. */
  isReply?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [replying, setReplying] = useState(false);
  const [draft, setDraft] = useState(comment.body);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Keep the draft in sync if the parent updates the comment (e.g. after
  // a successful edit elsewhere).
  useEffect(() => {
    if (!editing) setDraft(comment.body);
  }, [comment.body, editing]);

  const isPending = comment.id.startsWith("pending-");
  const m = comment.member;
  const role =
    m?.role === "admin" || m?.role === "super_admin" ? "Admin" : null;

  function saveEdit() {
    if (!draft.trim()) {
      setError("Comment can't be empty.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await editAgendaComment(comment.id, draft.trim());
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onEdit(comment.id, draft.trim());
      setEditing(false);
    });
  }

  function remove() {
    if (!confirm("Delete this comment?")) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteAgendaComment(comment.id);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onDelete(comment.id);
    });
  }

  return (
    <article
      className={cn(
        "flex gap-3",
        isPending && "opacity-60",
      )}
    >
      <Avatar
        name={m?.name ?? "?"}
        src={m?.photo_url ?? null}
        size="sm"
      />
      <div className="min-w-0 flex-1">
        <header className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-sm font-semibold text-heading">
            {m?.name ?? (isPending ? "Posting…" : "Former member")}
          </span>
          {role && (
            <span className="rounded-sm border border-border bg-surface px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted">
              {role}
            </span>
          )}
          {m?.company && (
            <span className="truncate text-xs text-muted">· {m.company}</span>
          )}
          <span className="ml-auto text-[11px] text-muted" title={comment.posted_at}>
            {timeAgo(comment.posted_at)}
            {comment.edited && " · edited"}
          </span>
        </header>

        {editing ? (
          <div className="mt-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.currentTarget.value)}
              rows={3}
              maxLength={4000}
              className="block w-full rounded-sm border border-border bg-bg px-3 py-2 text-sm focus-visible:border-heading focus-visible:outline-none"
            />
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={saveEdit}
                disabled={pending}
                className="inline-flex h-8 items-center gap-1.5 rounded-sm bg-heading px-3 text-xs font-medium text-white hover:bg-hover disabled:opacity-50"
              >
                <Check className="h-3 w-3" strokeWidth={2} />
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setDraft(comment.body);
                  setError(null);
                }}
                className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-border bg-bg px-3 text-xs font-medium text-text hover:border-heading hover:text-heading"
              >
                <X className="h-3 w-3" strokeWidth={2} />
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-1 whitespace-pre-wrap text-[15px] leading-relaxed text-text">
            {comment.body}
          </p>
        )}

        {!editing && !isPending && (
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
            {/* Reply: only at the root level, never on already-nested
                replies — keeps the thread one level deep. Anonymous
                visitors get bounced to login. */}
            {!isReply && (
              signedInMemberId ? (
                <button
                  type="button"
                  onClick={() => setReplying((r) => !r)}
                  className="inline-flex items-center gap-1 text-muted no-underline hover:text-heading"
                >
                  <CornerDownRight className="h-3 w-3" strokeWidth={2} />
                  {replying ? "Cancel" : "Reply"}
                </button>
              ) : (
                <Link
                  href={signInHref}
                  className="inline-flex items-center gap-1 text-muted no-underline hover:text-heading"
                >
                  <CornerDownRight className="h-3 w-3" strokeWidth={2} />
                  Sign in to reply
                </Link>
              )
            )}
            {comment.canEdit && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1 text-muted no-underline hover:text-heading"
              >
                <Pencil className="h-3 w-3" strokeWidth={2} />
                Edit
              </button>
            )}
            {comment.canDelete && (
              <button
                type="button"
                onClick={remove}
                disabled={pending}
                className={cn(
                  "inline-flex items-center gap-1 text-muted no-underline hover:text-danger disabled:opacity-50",
                  !isSelf && "text-danger/70",
                )}
                title={isSelf ? "Delete your comment" : "Delete (admin)"}
              >
                <Trash2 className="h-3 w-3" strokeWidth={2} />
                Delete
              </button>
            )}
          </div>
        )}

        {/* Inline reply composer — appears under the comment when toggled. */}
        {replying && signedInMemberId && (
          <div className="mt-3 rounded-sm border border-border bg-surface p-3">
            <Composer
              agendaId={agendaId}
              parentId={comment.id}
              signedInMemberId={signedInMemberId}
              compact
              onCancel={() => setReplying(false)}
              onPosted={(c) => {
                onReply(c);
                setReplying(false);
              }}
            />
          </div>
        )}

        {error && (
          <p className="mt-2 text-xs text-danger">{error}</p>
        )}
      </div>
    </article>
  );
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
