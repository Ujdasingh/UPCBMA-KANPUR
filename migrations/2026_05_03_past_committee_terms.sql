-- 2026-05-03  Past presidents & committees.
--
-- One row per FY term per chapter. The public page renders these grouped
-- by year — text-only when filled, never placeholder. Admins fill via
-- /admin/past-committees.

create table if not exists public.past_committee_terms (
  id                   uuid primary key default gen_random_uuid(),
  chapter_id           uuid not null references public.chapters(id) on delete cascade,
  fy_label             text not null,                                  -- "FY 2024-25"
  starts_on            date not null,
  ends_on              date not null check (ends_on >= starts_on),
  president_name       text not null,
  president_member_id  text references public.members(id) on delete set null,
  president_photo_url  text,
  -- Markdown allowed. Public page renders only when this is non-blank.
  achievements         text,
  display_order        integer not null default 0,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists idx_past_committee_terms_chapter
  on public.past_committee_terms(chapter_id, ends_on desc);

drop trigger if exists past_committee_terms_updated_at on public.past_committee_terms;
create trigger past_committee_terms_updated_at
  before update on public.past_committee_terms
  for each row execute function public.set_updated_at();

alter table public.past_committee_terms enable row level security;

drop policy if exists past_committee_terms_public_read on public.past_committee_terms;
create policy past_committee_terms_public_read on public.past_committee_terms
  for select to anon, authenticated using (true);

drop policy if exists past_committee_terms_admin_write on public.past_committee_terms;
create policy past_committee_terms_admin_write on public.past_committee_terms
  for all to authenticated
  using (
    exists (
      select 1 from public.members m
      where m.auth_user_id = auth.uid()
        and m.role in ('admin', 'super_admin')
    )
  )
  with check (
    exists (
      select 1 from public.members m
      where m.auth_user_id = auth.uid()
        and m.role in ('admin', 'super_admin')
    )
  );
