-- Vertex HRM — Time module (weekly timesheets).
-- Daily punch in/out (Dashboard's Time at Work widget) is a separate
-- concern from weekly project timesheets — this migration is the latter;
-- a `time_punches` table for the former is still a TODO (see the
-- Dashboard page's punch in/out handler).

create table timesheet_projects (
  id uuid primary key default gen_random_uuid(),
  name text not null
);
insert into timesheet_projects (name) values
  ('Internal / General'), ('Client Support');

create table timesheets (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id),
  week_starting date not null,
  status text not null default 'Draft' check (status in ('Draft', 'Submitted', 'Approved', 'Rejected')),
  submitted_at timestamptz,
  decided_by uuid references app_users(id),
  decided_at timestamptz,
  unique (employee_id, week_starting)
);

create table timesheet_entries (
  id uuid primary key default gen_random_uuid(),
  timesheet_id uuid not null references timesheets(id) on delete cascade,
  project_id uuid not null references timesheet_projects(id),
  day_of_week text not null check (day_of_week in ('Mon','Tue','Wed','Thu','Fri','Sat','Sun')),
  hours numeric(4,1) not null default 0 check (hours >= 0 and hours <= 24),
  unique (timesheet_id, project_id, day_of_week)
);

alter table timesheet_projects enable row level security;
alter table timesheets enable row level security;
alter table timesheet_entries enable row level security;

create policy "authenticated read timesheet_projects" on timesheet_projects for select using (auth.role() = 'authenticated');
create policy "authenticated read timesheets" on timesheets for select using (auth.role() = 'authenticated');
create policy "authenticated read timesheet_entries" on timesheet_entries for select using (auth.role() = 'authenticated');
create policy "authenticated insert own timesheets" on timesheets
  for insert with check (
    employee_id in (select employee_id from app_users where id = auth.uid())
  );
