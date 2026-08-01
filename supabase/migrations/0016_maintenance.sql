-- Vertex HRM — Maintenance module.
-- No new tables — Maintenance operates on existing tables (leave_requests,
-- timesheets, claims, audit_log) per the retention rules already defined
-- in data_retention_rules (migration 0009). This migration only adds a
-- dedicated log so purge actions are traceable independent of the
-- general audit_log (in case audit_log itself is ever the thing purged).

create table maintenance_purge_log (
  id uuid primary key default gen_random_uuid(),
  performed_by uuid not null references app_users(id),
  record_type text not null,
  older_than date not null,
  records_deleted int not null,
  performed_at timestamptz not null default now()
);

alter table maintenance_purge_log enable row level security;

create policy "authenticated read maintenance_purge_log" on maintenance_purge_log
  for select using (auth.role() = 'authenticated');
-- No insert policy for regular authenticated users — purge execution
-- should go through a server-side function using the service_role key,
-- not a direct client insert, given what this table represents.
