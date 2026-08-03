-- Vertex HRM — Compliance & Statutory Settings (HRM Admin spec §6).
-- §6.2 (statutory registration) and §6.3 (public holidays) are already
-- covered by organization_profile and holidays (migration 0004).

create table data_retention_rules (
  id uuid primary key default gen_random_uuid(),
  data_category text not null,
  retention_years int not null,
  action_after_expiry text not null check (action_after_expiry in ('Archive', 'Anonymize', 'Delete'))
);
insert into data_retention_rules (data_category, retention_years, action_after_expiry) values
  ('Employee Records', 7, 'Archive'),
  ('Payroll / Claims Records', 7, 'Archive'),
  ('Attachments / Documents', 5, 'Delete'),
  ('Audit Logs', 3, 'Anonymize');

create table data_subject_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references employees(id),
  request_type text not null check (request_type in ('Access', 'Rectify', 'Erase', 'Port')),
  status text not null default 'Received' check (status in ('Received', 'In Progress', 'Completed', 'Rejected')),
  due_date date,
  created_at timestamptz not null default now()
);

create table breach_notification_settings (
  id boolean primary key default true check (id),
  notify_emails text[] not null default '{}',
  dpo_name text,
  dpo_contact text
);
insert into breach_notification_settings (id) values (true);

-- Statutory Leave Defaults — seeds leave_types (created in HRM Admin
-- migration whenever the Leave module itself is built out; referenced
-- here since Admin owns the policy values, not the Leave module's
-- day-to-day request/approval tables).
create table leave_type_defaults (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  statutory_minimum_days int not null,
  configured_days int not null,
  notes text
);
insert into leave_type_defaults (name, statutory_minimum_days, configured_days, notes) values
  ('Annual Leave', 21, 21, '1.75 days/month accrual'),
  ('Sick Leave', 21, 21, '+30 days if hospitalized'),
  ('Maternity Leave', 98, 98, '14 weeks paid + 12 weeks unpaid'),
  ('Paternity Leave', 10, 10, 'Consecutive working days'),
  ('Compassionate Leave', 4, 4, null);

create table work_permits (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references employees(id),
  nationality text,
  gop_number text,
  expiry_date date not null
);

-- Status can't be a `generated ... stored` column on the table itself —
-- Postgres requires generated-column expressions to be IMMUTABLE, and
-- current_date isn't (it changes daily). A view has no such
-- restriction and re-evaluates on every query, which gives the same
-- "database computes it, nothing can drift" property without the
-- storage-layer constraint.
create view work_permits_with_status as
select
  wp.*,
  case
    when wp.expiry_date < current_date then 'Expired'
    when wp.expiry_date < current_date + interval '90 days' then 'Pending Renewal'
    else 'Valid'
  end as status
from work_permits wp;

alter table data_retention_rules enable row level security;
alter table data_subject_requests enable row level security;
alter table breach_notification_settings enable row level security;
alter table leave_type_defaults enable row level security;
alter table work_permits enable row level security;

create policy "authenticated read data_retention_rules" on data_retention_rules for select using (auth.role() = 'authenticated');
create policy "authenticated read data_subject_requests" on data_subject_requests for select using (auth.role() = 'authenticated');
create policy "authenticated read leave_type_defaults" on leave_type_defaults for select using (auth.role() = 'authenticated');
create policy "authenticated read work_permits" on work_permits for select using (auth.role() = 'authenticated');

-- Views need an explicit grant on the view object itself — the
-- underlying table's RLS policy above still applies to what rows come
-- through, this just allows querying the view at all.
grant select on work_permits_with_status to authenticated;
