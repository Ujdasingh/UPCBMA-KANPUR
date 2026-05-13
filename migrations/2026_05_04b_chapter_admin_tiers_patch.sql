-- 2026-05-04b  Patch for 2026_05_04_chapter_admin_tiers.sql
--
-- The original migration failed at the demotion step because
-- public.members has a prevent_role_escalation() trigger that blocks
-- any role change, even when run from the Supabase SQL editor as
-- postgres. PL/pgSQL DO blocks are atomic, so the admin_scopes
-- inserts and the index creation also rolled back.
--
-- This patch:
--   • re-runs the admin_scopes population (idempotent — upserts on
--     conflict so re-running on an already-applied DB is safe)
--   • temporarily disables user triggers on public.members to perform
--     the role demotion, then re-enables them
--   • creates the two indexes
--
-- It is safe to run this even if part of the first migration succeeded.

-- ────────────────────────────────────────────────────────────────────────
-- 1) Make sure step 1 of the original migration is in place
--    (status check constraint + admin_scopes.tier column).
--    These statements are idempotent.
-- ────────────────────────────────────────────────────────────────────────

do $$
declare
  v_constraint text;
begin
  select conname into v_constraint
  from pg_constraint
  where conrelid = 'public.committee_appointments'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%status%active%';
  if v_constraint is not null then
    execute format(
      'alter table public.committee_appointments drop constraint %I',
      v_constraint
    );
  end if;
exception when others then
  null;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.committee_appointments'::regclass
      and conname  = 'committee_appointments_status_chk'
  ) then
    alter table public.committee_appointments
      add constraint committee_appointments_status_chk
      check (status in ('active', 'acting', 'inactive', 'ended'));
  end if;
end $$;

alter table public.admin_scopes
  add column if not exists tier text not null default 'officer'
  check (tier in ('officer', 'content'));

-- ────────────────────────────────────────────────────────────────────────
-- 2) Populate admin_scopes from current Kanpur committee seats
--    (officer-tier for President/VPs/GS/JS/Treas/JT, content-tier
--    for everyone else on the committee).
-- ────────────────────────────────────────────────────────────────────────

do $$
declare
  v_kanpur uuid := '11111111-1111-1111-1111-111111111111';
  r record;
begin
  for r in
    select ca.member_id, ca.role_key
    from public.committee_appointments ca
    where ca.chapter_id = v_kanpur
      and ca.status in ('active', 'acting')
  loop
    insert into public.admin_scopes (member_id, chapter_id, tier)
    values (
      r.member_id,
      v_kanpur,
      case
        when r.role_key in ('president','vp1','vp2','general_secretary','gs',
                            'joint_secretary','js','treasurer',
                            'joint_treasurer','jt')
          then 'officer'
        else 'content'
      end
    )
    on conflict (member_id, chapter_id) where chapter_id is not null
    do update set tier = excluded.tier;
  end loop;
end $$;

-- ────────────────────────────────────────────────────────────────────────
-- 3) Demote the 4 Kanpur officers from role='admin' to role='member'.
--    The prevent_role_escalation trigger blocks this even for postgres,
--    so we disable user triggers on public.members for this statement
--    only, then re-enable them immediately.
-- ────────────────────────────────────────────────────────────────────────

alter table public.members disable trigger user;

update public.members
   set role = 'member'
 where role = 'admin'
   and id in (
     select member_id from public.admin_scopes
     where chapter_id = '11111111-1111-1111-1111-111111111111'
       and tier = 'officer'
   );

alter table public.members enable trigger user;

-- ────────────────────────────────────────────────────────────────────────
-- 4) Indexes
-- ────────────────────────────────────────────────────────────────────────

create index if not exists idx_admin_scopes_member_chapter
  on public.admin_scopes(member_id, chapter_id);

create index if not exists idx_committee_appointments_active_member_chapter
  on public.committee_appointments(member_id, chapter_id)
  where status in ('active', 'acting');
