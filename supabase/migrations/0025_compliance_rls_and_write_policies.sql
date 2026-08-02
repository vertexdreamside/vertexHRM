-- Write policies for Compliance (HRM Admin spec §6) ahead of wiring it
-- to real queries.
--
-- `breach_notification_settings` had RLS enabled in migration 0009 but
-- NO policies at all — same class of bug as employees (0001) and
-- role_permissions (0001), fourth time this exact gap has turned up.
-- Worth noting as a pattern: every table added without an accompanying
-- SELECT policy in the same migration has had this problem. Worth a
-- deliberate sweep of any remaining un-wired tables before assuming
-- they're fine just because RLS is "enabled."

create policy "authenticated read breach_notification_settings" on breach_notification_settings
  for select using (auth.role() = 'authenticated');
create policy "authenticated update breach_notification_settings" on breach_notification_settings
  for update using (auth.role() = 'authenticated');

create policy "authenticated insert data_retention_rules" on data_retention_rules
  for insert with check (auth.role() = 'authenticated');
create policy "authenticated delete data_retention_rules" on data_retention_rules
  for delete using (auth.role() = 'authenticated');

create policy "authenticated insert data_subject_requests" on data_subject_requests
  for insert with check (auth.role() = 'authenticated');
create policy "authenticated update data_subject_requests" on data_subject_requests
  for update using (auth.role() = 'authenticated');

create policy "authenticated update leave_type_defaults" on leave_type_defaults
  for update using (auth.role() = 'authenticated');

create policy "authenticated insert work_permits" on work_permits
  for insert with check (auth.role() = 'authenticated');
create policy "authenticated update work_permits" on work_permits
  for update using (auth.role() = 'authenticated');
