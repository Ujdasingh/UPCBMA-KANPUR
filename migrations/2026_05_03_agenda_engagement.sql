-- 2026-05-03  Agenda engagement: per-member votes + edit-window for comments.
--
-- Notes for the operator:
--   * agenda_comments already exists from migration-agendas.sql with the
--     columns (id, agenda_id, member_id, parent_id, body, posted_at,
--     hidden, hidden_by). We keep that schema and only add `updated_at`
--     so the UI can render "(edited)" markers and enforce a 15-min
--     self-edit window from the existing posted_at field.
--   * agenda_votes is new — one row per (agenda, member) with up/down.

-- ────────────────────────────────────────────────────────────────────────
-- 1) VOTES (new)
-- ────────────────────────────────────────────────────────────────────────

create table if not exists public.agenda_votes (
  agenda_id   uuid not null references public.agendas(id) on delete cascade,
  member_id   text not null references public.members(id) on delete cascade,
  vote        text not null check (vote in ('up', 'down')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (agenda_id, member_id)
);

create index if not exists idx_agenda_votes_agenda
  on public.agenda_votes(agenda_id);

drop trigger if exists agenda_votes_updated_at on public.agenda_votes;
create trigger agenda_votes_updated_at
  before update on public.agenda_votes
  for each row execute function public.set_updated_at();

alter table public.agenda_votes enable row level security;

drop policy if exists agenda_votes_public_read on public.agenda_votes;
create policy agenda_votes_public_read on public.agenda_votes
  for select to anon, authenticated using (true);

drop policy if exists agenda_votes_self_write on public.agenda_votes;
create policy agenda_votes_self_write on public.agenda_votes
  for all to authenticated
  using (
    exists (
      select 1 from public.members m
      where m.id = agenda_votes.member_id
        and m.auth_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.members m
      where m.id = agenda_votes.member_id
        and m.auth_user_id = auth.uid()
    )
  );

drop policy if exists agenda_votes_admin_delete on public.agenda_votes;
create policy agenda_votes_admin_delete on public.agenda_votes
  for delete to authenticated
  using (
    exists (
      select 1 from public.members m
      where m.auth_user_id = auth.uid()
        and m.role in ('admin', 'super_admin')
    )
  );

-- ────────────────────────────────────────────────────────────────────────
-- 2) COMMENTS (extension)
-- ────────────────────────────────────────────────────────────────────────

-- Add updated_at so the UI can show "(edited)" and so we can keep the
-- 15-minute self-edit window honest.
alter table public.agenda_comments
  add column if not exists updated_at timestamptz not null default now();

-- Bump it on any UPDATE.
drop trigger if exists agenda_comments_updated_at on public.agenda_comments;
create trigger agenda_comments_updated_at
  before update on public.agenda_comments
  for each row execute function public.set_updated_at();

-- Make sure RLS policies on the existing table allow what we need.
alter table public.agenda_comments enable row level security;

drop policy if exists agenda_comments_public_read on public.agenda_comments;
create policy agenda_comments_public_read on public.agenda_comments
  for select to anon, authenticated using (hidden = false);

drop policy if exists agenda_comments_self_insert on public.agenda_comments;
create policy agenda_comments_self_insert on public.agenda_comments
  for insert to authenticated
  with check (
    exists (
      select 1 from public.members m
      where m.id = agenda_comments.member_id
        and m.auth_user_id = auth.uid()
    )
  );

drop policy if exists agenda_comments_self_update on public.agenda_comments;
create policy agenda_comments_self_update on public.agenda_comments
  for update to authenticated
  using (
    exists (
      select 1 from public.members m
      where m.id = agenda_comments.member_id
        and m.auth_user_id = auth.uid()
    )
  );
