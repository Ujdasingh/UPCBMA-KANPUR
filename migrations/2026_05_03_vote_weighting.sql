-- 2026-05-03  Add vote weighting to agenda_votes.
--
-- Rationale: every member can vote, but a sitting committee member's
-- view is operational signal, not just opinion. We weight by role at
-- the moment of voting (snapshotted onto the row) so a later change
-- in role doesn't retroactively rewrite the totals.
--
-- Default weight is 1 — same as before. The action computes the right
-- weight on insert/update from the member's current committee role.

alter table public.agenda_votes
  add column if not exists weight integer not null default 1
  check (weight between 1 and 5);

comment on column public.agenda_votes.weight is
  'Snapshot of the voter''s role weight at the time the vote was cast: 1=member, 2=committee, 3=officer (president/secretary/treasurer). Doesn''t auto-update if the role changes.';
