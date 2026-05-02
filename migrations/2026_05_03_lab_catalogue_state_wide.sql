-- 2026-05-03  Make the lab catalogue state-wide by default.
--
-- Until now each chapter owned its own copy of the lab tests, which means
-- adding a new chapter requires duplicating the same 8 entries. We're
-- pivoting so that:
--
--   * lab_tests_catalog rows with chapter_id IS NULL are the *state* set
--     and are visible on every chapter's lab page.
--   * Chapter-specific overrides are still allowed (chapter_id = <uuid>),
--     for the rare case where a chapter offers a different test or price.
--
-- Public queries OR the two: `chapter_id.eq.<X> OR chapter_id IS NULL`.
-- Admin /admin/lab-tests stays chapter-scoped via the sidebar switcher;
-- super-admins can switch to the "All chapters" view to manage the state
-- catalogue from there.

-- 1. Make sure the column is nullable (the multi-chapter migration already
--    made it nullable, but we re-affirm in case this is being applied to
--    a fork that hasn't run that migration yet).
alter table public.lab_tests_catalog
  alter column chapter_id drop not null;

-- 2. Move the existing 8 Kanpur tests to the state catalogue. We only
--    move rows that look like the *original* seeded set — anything a
--    chapter has explicitly customised stays put. The seed used integer
--    sort_order between 0 and 100 and the Kanpur chapter UUID; if you
--    seeded extras after that, edit them in the admin and they'll
--    survive this migration untouched.
update public.lab_tests_catalog
   set chapter_id = null
 where chapter_id = '11111111-1111-1111-1111-111111111111'
   and code in (
     -- Conservative list — adjust if you've renamed any test codes.
     'BST', 'CCT', 'COB', 'GSM', 'MOI', 'BCT', 'PCT', 'EDG'
   );

-- 3. If you'd rather make ALL existing rows state-wide regardless of
--    code, run the one-liner below instead. Commented out by default
--    since it's destructive of any chapter-specific overrides:
--
--   update public.lab_tests_catalog set chapter_id = null;
