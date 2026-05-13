-- 2026-05-05  Chapter-scope the admin audit log.
--
-- Before this migration, admin_audit_log was super-only (every entry
-- visible from /admin/super/audit). Now chapter admins (Tier 3) have a
-- legitimate need to see who changed what in their chapter — committee
-- swaps, member invites, lock toggles for their resources — without
-- seeing state-wide actions from other chapters.
--
-- Adding chapter_id as a nullable column means:
--   • Existing rows (impersonation, site_settings, agenda approvals)
--     stay visible to Tier 2+ via NULL chapter_id (state-scoped).
--   • New writes from committee/members/locks actions populate it with
--     the chapter the action affected.

alter table public.admin_audit_log
  add column if not exists chapter_id uuid references public.chapters(id) on delete set null;

comment on column public.admin_audit_log.chapter_id is
  'When the audited action affected a specific chapter (committee '
  'appointment in Kanpur, member invite to Lucknow), the chapter UUID '
  'is recorded here. NULL means state-scoped action (site settings, '
  'agenda approvals, impersonation).';

create index if not exists idx_admin_audit_log_chapter_id
  on public.admin_audit_log(chapter_id, created_at desc);

create index if not exists idx_admin_audit_log_created_at
  on public.admin_audit_log(created_at desc);
