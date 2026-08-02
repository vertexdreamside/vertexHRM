-- Write policies for Time (Timesheets) ahead of wiring it to real
-- queries, plus a new `time_punches` table — Dashboard's punch in/out
-- widget and Time's Attendance tab both need one and neither had it;
-- this is the natural point to add it since Time is what's being
-- wired now.

create policy "authenticated update timesheets" on timesheets
  for update using (auth.role() = 'authenticated');

create policy "authenticated insert timesheet_entries" on timesheet_entries
  for insert with check (auth.role() = 'authenticated');
create policy "authenticated update timesheet_entries" on timesheet_entries
  for update using (auth.role() = 'authenticated');

create policy "authenticated insert timesheet_projects" on timesheet_projects
  for insert with check (auth.role() = 'authenticated');

create table time_punches (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id),
  punch_in timestamptz not null default now(),
  punch_out timestamptz
);

create index time_punches_employee_idx on time_punches(employee_id);

alter table time_punches enable row level security;

create policy "authenticated read time_punches" on time_punches
  for select using (auth.role() = 'authenticated');
create policy "authenticated insert own time_punches" on time_punches
  for insert with check (
    employee_id in (select employee_id from app_users where id = auth.uid())
  );
create policy "authenticated update own time_punches" on time_punches
  for update using (
    employee_id in (select employee_id from app_users where id = auth.uid())
  );
