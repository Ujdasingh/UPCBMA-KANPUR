-- 2026-05-04  Chapter-admin tiers + acting status + officer-derived rights.
--
-- Locks in the four-tier model:
--   0. super_admin (members.role = 'super_admin')             — invisible
--   1. Admin UPCBMA  (admin_scopes with chapter_id IS NULL)   — state secretariat
--   2. Chapter Admin (admin_scopes with chapter_id = X, tier='officer'   for President/VP/GS/JS/Treas/JT/EC)
--                    (admin_scopes with chapter_id = X, tier='content'   for any other committee row)
--   3. Member        (no admin_scopes row)                    — everyone else
--
-- Rights flow from CURRENT seat. The moment an appointment status
-- leaves ('active', 'acting'), the matching admin_scopes row is removed
-- (committee/actions.ts handles that). No transition window.

-- ────────────────────────────────────────────────────────────────────────
-- 1) Acting status on committee_appointments
-- ────────────────────────────────────────────────────────────────────────

-- Drop the existing CHECK constraint and re-create with 'acting' added.
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
  -- Constraint may already be loose / missing — fine, we re-add below.
  null;
end $$;

alter table public.committee_appointments
  add constraint committee_appointments_status_chk
  check (status in ('active', 'acting', 'inactive', 'ended'));

comment on column public.committee_appointments.status is
  '''active'' = substantive holder. ''acting'' = interim/acting holder, '
  'carries same rights as active. ''inactive'' = on-hold (no rights). '
  '''ended'' = past term, no rights.';

-- ────────────────────────────────────────────────────────────────────────
-- 2) admin_scopes.tier — officer vs content
-- ────────────────────────────────────────────────────────────────────────

alter table public.admin_scopes
  add column if not exists tier text not null default 'officer'
  check (tier in ('officer', 'content'));

comment on column public.admin_scopes.tier is
  '''officer'' = full chapter admin (members, office, lab, content). '
  '''content'' = content-only (news, agendas, events, committee). '
  'Computed from the holder''s committee seat in committee/actions.ts.';

-- ────────────────────────────────────────────────────────────────────────
-- 3) Sync existing Kanpur officers from role='admin' to chapter-scoped
--    admin_scopes. Drops their cross-chapter blanket admin role.
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
    -- Officer roles get tier='officer'; everything else gets tier='content'.
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

  -- Demote the 4 Kanpur officers from role='admin' back to role='member'.
  -- They keep their privileges through admin_scopes, but they're no longer
  -- cross-chapter admins. Their public profile stays unchanged.
  update public.members
     set role = 'member'
   where role = 'admin'
     and id in (
       select member_id from public.admin_scopes
       where chapter_id = v_kanpur and tier = 'officer'
     );
end $$;

-- ────────────────────────────────────────────────────────────────────────
-- 4) Indexes for fast permission lookups
-- ────────────────────────────────────────────────────────────────────────

create index if not exists idx_admin_scopes_member_chapter
  on public.admin_scopes(member_id, chapter_id);

create index if not exists idx_committee_appointments_active_member_chapter
  on public.committee_appointments(member_id, chapter_id)
  where status in ('active', 'acting');
