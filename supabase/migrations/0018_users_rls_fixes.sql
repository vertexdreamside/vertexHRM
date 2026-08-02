-- Fixes ahead of wiring the Users module to real queries.
--
-- 1. `employees` had RLS enabled in migration 0001 but no SELECT policy
--    was ever added — meaning it's currently unreadable by anyone
--    (Postgres RLS is deny-by-default once enabled). PIM/Directory/Users
--    all need to read it.
-- 2. `app_users` only had a "read own row" policy — fine for a
--    self-service context, but the Users admin screen needs to list
--    everyone. Broadened to authenticated-read-all, same baseline
--    caveat as the rest of migration 0001: proper role-scoped
--    visibility (via Roles & Permissions, §1.2) is still a TODO, this
--    is the same "baseline, tighten later" pattern already used
--    elsewhere in this schema.

create policy "authenticated read employees" on employees
  for select using (auth.role() = 'authenticated');

create policy "authenticated read all app_users" on app_users
  for select using (auth.role() = 'authenticated');
