-- Fixes and additions ahead of wiring Roles & Permissions to real queries.
--
-- `role_permissions` had RLS enabled in migration 0001 but NO policies
-- at all were ever added for it — meaning it's been completely
-- unreadable AND unwritable by anyone this whole time (same class of
-- bug as the `employees` gap fixed in migration 0018). Since Roles &
-- Permissions manages this table directly, this can't wait any longer.
--
-- Also adds insert/update/delete policies for `roles` and
-- `role_permissions` themselves — migration 0001 only ever added
-- baseline SELECT policies, nothing wrote to these tables from the
-- client before now. Same "baseline, tighten later" caveat as
-- elsewhere: this is authenticated-can-mutate, not yet scoped to
-- "only System Administrators can mutate roles" — that needs the
-- Roles & Permissions screen to be able to bootstrap itself before it
-- can also gate itself, which is a bit of a chicken-and-egg problem
-- worth flagging rather than quietly working around.

create policy "authenticated read role_permissions" on role_permissions
  for select using (auth.role() = 'authenticated');

create policy "authenticated insert roles" on roles
  for insert with check (auth.role() = 'authenticated');
create policy "authenticated update roles" on roles
  for update using (auth.role() = 'authenticated');
create policy "authenticated delete roles" on roles
  for delete using (auth.role() = 'authenticated' and is_system = false);

create policy "authenticated insert role_permissions" on role_permissions
  for insert with check (auth.role() = 'authenticated');
create policy "authenticated update role_permissions" on role_permissions
  for update using (auth.role() = 'authenticated');
create policy "authenticated delete role_permissions" on role_permissions
  for delete using (auth.role() = 'authenticated');
