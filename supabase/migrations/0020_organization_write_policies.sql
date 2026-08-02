-- Write policies for Organization (HRM Admin spec §2) ahead of wiring
-- it to real queries. departments/locations (migration 0001) and
-- organization_profile/holidays (migration 0004) only ever had
-- SELECT policies — nothing wrote to them from the client before now.
-- Same baseline caveat as migrations 0018/0019: authenticated-can-write,
-- not yet role-scoped.

create policy "authenticated insert departments" on departments
  for insert with check (auth.role() = 'authenticated');
create policy "authenticated update departments" on departments
  for update using (auth.role() = 'authenticated');
create policy "authenticated delete departments" on departments
  for delete using (auth.role() = 'authenticated');

create policy "authenticated insert locations" on locations
  for insert with check (auth.role() = 'authenticated');
create policy "authenticated update locations" on locations
  for update using (auth.role() = 'authenticated');
create policy "authenticated delete locations" on locations
  for delete using (auth.role() = 'authenticated');

create policy "authenticated update organization_profile" on organization_profile
  for update using (auth.role() = 'authenticated');

create policy "authenticated insert holidays" on holidays
  for insert with check (auth.role() = 'authenticated');
create policy "authenticated delete holidays" on holidays
  for delete using (auth.role() = 'authenticated');
