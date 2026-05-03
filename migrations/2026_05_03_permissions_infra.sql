-- 2026-05-03  Permissions infrastructure.
--
-- Two new tables:
--   1. `permissions` — read-only catalogue of every action key the app
--      knows about, grouped by area for the admin matrix UI.
--   2. `member_permissions` — direct grants from admin/super_admin to a
--      specific member.
--
-- Effective check unions (via app helper hasPermission):
--    super_admin role  → all permissions, including super.* keys
--    admin role        → all permissions EXCEPT super.* keys
--    direct grants     → keys from member_permissions
--    committee auto    → active committee appointment grants the content
--                        tier (news.edit, agendas.edit, events.edit,
--                        committee.edit) automatically — no explicit row
--                        needed.
--
-- Idempotent: every insert uses ON CONFLICT DO NOTHING / DO UPDATE.

-- ────────────────────────────────────────────────────────────────────────
-- 1) Catalogue
-- ────────────────────────────────────────────────────────────────────────

create table if not exists public.permissions (
  key          text primary key,
  label        text not null,
  area         text not null check (area in (
                  'content', 'committee', 'lab', 'members_office', 'super'
                )),
  description  text,
  display_order integer not null default 0
);

-- Seed the initial catalogue. ON CONFLICT lets us re-run safely if we
-- add new keys later — existing rows keep their (admin-edited) labels.
insert into public.permissions (key, label, area, description, display_order) values
  ('news.edit',            'Edit news',                  'content',         'Create, edit and publish news posts.',                                10),
  ('agendas.edit',         'Edit agendas',               'content',         'Create and edit agendas. Approval is separate.',                       20),
  ('agendas.approve',      'Approve agendas',            'content',         'Approve member-proposed agendas so they appear publicly.',             30),
  ('events.edit',          'Edit events',                'content',         'Schedule, edit and cancel events.',                                    40),
  ('messages.manage',      'Triage contact messages',    'content',         'Read and resolve incoming contact-form messages.',                     50),
  ('committee.edit',       'Edit committee appointments','committee',       'Add, end and reorder committee appointments for the active chapter.',  60),
  ('committee_roles.edit', 'Edit committee role catalogue','committee',     'Manage the list of available roles (President, Treasurer, etc.).',     70),
  ('lab.edit',             'Edit lab catalogue',         'lab',             'Add, remove and reprice lab tests.',                                   80),
  ('bookings.manage',      'Manage lab bookings',        'lab',             'Triage, confirm and complete lab booking requests.',                   90),
  ('members.edit',         'Edit members roster',        'members_office',  'Add, edit and deactivate member rows.',                               100),
  ('members.invite',       'Invite members',             'members_office',  'Send invite emails to onboard new members.',                          110),
  ('members.set_admin',    'Promote members to admin',   'members_office',  'Toggle the admin role on a member row.',                              120),
  ('office.edit',          'Edit office info',           'members_office',  'Update the chapter office address, hours, and contact details.',      130),
  ('chapters.edit',        'Edit chapter list',          'super',           'Add or rename chapters; super-admin sphere.',                         140),
  ('super.access',         'Super-admin tools',          'super',           'Locks, impersonation, audit log, site-wide settings.',                150)
on conflict (key) do update
  set label = excluded.label,
      area = excluded.area,
      description = excluded.description,
      display_order = excluded.display_order;

-- ────────────────────────────────────────────────────────────────────────
-- 2) Direct grants
-- ────────────────────────────────────────────────────────────────────────

create table if not exists public.member_permissions (
  member_id      text not null references public.members(id) on delete cascade,
  permission_key text not null references public.permissions(key) on delete cascade,
  granted_by     text references public.members(id) on delete set null,
  granted_at     timestamptz not null default now(),
  primary key (member_id, permission_key)
);

create index if not exists idx_member_permissions_member
  on public.member_permissions(member_id);

alter table public.member_permissions enable row level security;

-- Read: anyone authenticated can see their own grants (used by /me / nav).
-- Admins can see all via service-role queries server-side, no policy needed.
drop policy if exists member_permissions_self_read on public.member_permissions;
create policy member_permissions_self_read on public.member_permissions
  for select to authenticated
  using (
    exists (
      select 1 from public.members m
      where m.id = member_permissions.member_id
        and m.auth_user_id = auth.uid()
    )
  );

-- Write: admin/super_admin only. Service-role bypasses RLS for the
-- /admin/permissions UI; this policy is the safety net if anything ever
-- writes via the anon/authenticated client.
drop policy if exists member_permissions_admin_write on public.member_permissions;
create policy member_permissions_admin_write on public.member_permissions
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
