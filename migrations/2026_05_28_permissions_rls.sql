-- 2026-05-28 Enable RLS on public.permissions to resolve security advisor warning

alter table public.permissions enable row level security;

-- The permissions table is a read-only catalogue.
-- Allow authenticated users to read the catalogue.
-- Writes are restricted to service role (which bypasses RLS).

drop policy if exists permissions_read_all on public.permissions;
create policy permissions_read_all on public.permissions
  for select to authenticated
  using (true);
