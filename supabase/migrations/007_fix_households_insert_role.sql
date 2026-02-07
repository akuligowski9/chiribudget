-- Migration: Fix households INSERT policy to apply to authenticated role
--
-- Bug: Previous policy applied to PUBLIC role (anonymous users)
-- but we need it to apply to AUTHENTICATED role (logged-in users)

drop policy if exists households_insert on households;
create policy households_insert on households
for insert to authenticated
with check (auth.uid() is not null);
