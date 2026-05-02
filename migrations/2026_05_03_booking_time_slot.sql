-- 2026-05-03  Add time-slot column to bookings.
--
-- The booking form now offers a fixed list of weekday slots
-- (10:00-11:00, 11:00-12:00, etc.). We store it as plain text so admins
-- can enter custom slots for special days without a schema change.
--
-- Backwards-compatible: column is nullable, no default. Existing rows
-- and any client that doesn't send `preferred_time` keep working.

alter table public.bookings
  add column if not exists preferred_time text;

comment on column public.bookings.preferred_time is
  'Self-selected booking slot, e.g. "14:00-15:00". Free-form text so admins can override.';
