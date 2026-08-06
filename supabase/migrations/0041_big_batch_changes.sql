-- Large batch of schema changes supporting the next round of requested
-- fixes/features across Organization, PIM, Job Section, Corporate
-- Branding, Email Subscriptions, and Leave.

-- ---------------------------------------------------------------------
-- Organization: locations bug fix + notes
-- ---------------------------------------------------------------------
-- Real bug found: the Add Location form has always sent `address` in
-- its insert, but this column never existed — Supabase rejects the
-- insert (unknown column), and since the form had no error handling,
-- it silently failed and looked like "doesn't save." Adding the
-- column fixes the actual bug; `notes` is the newly requested field.
alter table locations add column if not exists address text;
alter table locations add column if not exists notes text;

-- Organization Unit — Unit ID + Description on departments (the table
-- that backs the Structure tab's org units).
alter table departments add column if not exists unit_id text;
alter table departments add column if not exists description text;

-- ---------------------------------------------------------------------
-- Job Section: Work Shifts — assign to employees
-- ---------------------------------------------------------------------
create table if not exists work_shift_assignments (
  id uuid primary key default gen_random_uuid(),
  work_shift_id uuid not null references work_shifts(id) on delete cascade,
  employee_id uuid not null references employees(id),
  unique (work_shift_id, employee_id)
);

alter table work_shift_assignments enable row level security;
create policy "authenticated read work_shift_assignments" on work_shift_assignments for select using (auth.role() = 'authenticated');
create policy "authenticated insert work_shift_assignments" on work_shift_assignments for insert with check (auth.role() = 'authenticated');
create policy "authenticated delete work_shift_assignments" on work_shift_assignments for delete using (auth.role() = 'authenticated');

-- work_shifts itself needs an update policy — it only ever had select/insert.
create policy "authenticated update work_shifts" on work_shifts for update using (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------
-- Corporate Branding: Secondary Color, Secondary Font Color, Primary
-- Gradient Color 2
-- ---------------------------------------------------------------------
alter table branding_settings add column if not exists secondary_color text;
alter table branding_settings add column if not exists secondary_font_color text;
alter table branding_settings add column if not exists primary_gradient_color_2 text;

-- ---------------------------------------------------------------------
-- Email Subscriptions: real named/emailed recipients per notification
-- type, replacing the bare uuid[] (which only ever pointed at existing
-- app_users and had no UI to manage it).
-- ---------------------------------------------------------------------
create table if not exists email_subscription_recipients (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references email_subscriptions(id) on delete cascade,
  name text not null,
  email text not null
);

alter table email_subscription_recipients enable row level security;
create policy "authenticated read email_subscription_recipients" on email_subscription_recipients for select using (auth.role() = 'authenticated');
create policy "authenticated insert email_subscription_recipients" on email_subscription_recipients for insert with check (auth.role() = 'authenticated');
create policy "authenticated delete email_subscription_recipients" on email_subscription_recipients for delete using (auth.role() = 'authenticated');

create policy "authenticated update email_subscriptions" on email_subscriptions for update using (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------
-- Modules: needs an update policy too (only ever had select before —
-- Configuration's ModulesTab has been writing to this table already,
-- meaning it was relying on select-only RLS and any writes were
-- silently failing at the database level this whole time).
-- ---------------------------------------------------------------------
create policy "authenticated update modules" on modules for update using (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------
-- PIM: employee photo
-- ---------------------------------------------------------------------
alter table employees add column if not exists photo_url text;

insert into storage.buckets (id, name, public)
values ('employee-photos', 'employee-photos', true)
on conflict (id) do nothing;

create policy "public read employee-photos bucket" on storage.objects for select using (bucket_id = 'employee-photos');
create policy "authenticated upload employee-photos bucket" on storage.objects for insert with check (bucket_id = 'employee-photos' and auth.role() = 'authenticated');

-- ---------------------------------------------------------------------
-- PIM: custom Reports builder
-- ---------------------------------------------------------------------
create table if not exists pim_reports (
  id uuid primary key default gen_random_uuid(),
  report_name text not null,
  include_scope text not null default 'current' check (include_scope in ('current', 'past', 'both')),
  selection_criteria jsonb not null default '{}',
  display_fields text[] not null default '{}',
  include_header boolean not null default true,
  created_at timestamptz not null default now()
);

alter table pim_reports enable row level security;
create policy "authenticated read pim_reports" on pim_reports for select using (auth.role() = 'authenticated');
create policy "authenticated insert pim_reports" on pim_reports for insert with check (auth.role() = 'authenticated');
create policy "authenticated delete pim_reports" on pim_reports for delete using (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------
-- PIM Configuration: Reporting Methods / Termination Reasons — were
-- pure local React state (SEED_ constants), never persisted, which is
-- why adding an entry "didn't work" (it vanished on refresh). Real
-- tables now, same generic-list pattern used elsewhere.
-- ---------------------------------------------------------------------
create table if not exists reporting_methods (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);
insert into reporting_methods (name) values ('Direct'), ('Indirect'), ('Matrix');

create table if not exists termination_reasons (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);
insert into termination_reasons (name) values ('Resignation'), ('Termination'), ('Retirement'), ('Contract End'), ('Redundancy');

alter table reporting_methods enable row level security;
create policy "authenticated read reporting_methods" on reporting_methods for select using (auth.role() = 'authenticated');
create policy "authenticated insert reporting_methods" on reporting_methods for insert with check (auth.role() = 'authenticated');
create policy "authenticated delete reporting_methods" on reporting_methods for delete using (auth.role() = 'authenticated');

alter table termination_reasons enable row level security;
create policy "authenticated read termination_reasons" on termination_reasons for select using (auth.role() = 'authenticated');
create policy "authenticated insert termination_reasons" on termination_reasons for insert with check (auth.role() = 'authenticated');
create policy "authenticated delete termination_reasons" on termination_reasons for delete using (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------
-- PIM Configuration: Optional Fields / Custom Fields moved here from
-- Admin — same table, just relocated in the UI, so custom_fields
-- (from migration 0008) needs nothing new. optional_fields is new
-- (was hardcoded SEED_OPTIONAL_FIELDS with no table at all).
-- ---------------------------------------------------------------------
create table if not exists optional_fields (
  key text primary key,
  label text not null,
  visible boolean not null default true
);
insert into optional_fields (key, label, visible) values
  ('middleName', 'Middle Name', false),
  ('nickname', 'Nickname', false),
  ('maritalStatus', 'Marital Status', true),
  ('drivingLicense', 'Driving License Number', false);

alter table optional_fields enable row level security;
create policy "authenticated read optional_fields" on optional_fields for select using (auth.role() = 'authenticated');
create policy "authenticated update optional_fields" on optional_fields for update using (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------
-- Leave: Is Entitlement Situational?, Work Week, editable Holidays
-- (holidays already supports edit via existing update policy? check —
-- migration 0004 only had select; adding write policies)
-- ---------------------------------------------------------------------
alter table leave_type_defaults add column if not exists is_situational boolean not null default false;
create policy "authenticated insert leave_type_defaults" on leave_type_defaults for insert with check (auth.role() = 'authenticated');
create policy "authenticated delete leave_type_defaults" on leave_type_defaults for delete using (auth.role() = 'authenticated');

create table if not exists work_week_settings (
  day text primary key,
  day_type text not null default 'Full Day' check (day_type in ('Full Day', 'Half Day', 'Non-Working Day'))
);
insert into work_week_settings (day, day_type) values
  ('Monday', 'Full Day'), ('Tuesday', 'Full Day'), ('Wednesday', 'Full Day'),
  ('Thursday', 'Full Day'), ('Friday', 'Full Day'), ('Saturday', 'Non-Working Day'), ('Sunday', 'Non-Working Day')
on conflict (day) do nothing;

alter table work_week_settings enable row level security;
create policy "authenticated read work_week_settings" on work_week_settings for select using (auth.role() = 'authenticated');
create policy "authenticated update work_week_settings" on work_week_settings for update using (auth.role() = 'authenticated');

create policy "authenticated update holidays" on holidays for update using (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------
-- Modules: fix the seed data before enforcing it. Most modules were
-- seeded `enabled = false` back when this table was first created
-- (before most modules existed at all) — enforcing that as-is now
-- would suddenly hide most of the working sidebar. Setting every real,
-- built module to enabled, and adding the one that was missing
-- (My Info never had a modules row at all).
-- ---------------------------------------------------------------------
update modules set enabled = true where key in ('pim', 'time', 'recruitment', 'performance', 'directory', 'maintenance', 'claims', 'buzz');

insert into modules (key, name, enabled)
values ('myinfo', 'My Info', true)
on conflict (key) do nothing;

-- Email Subscriptions: on/off toggle per notification type (card
-- redesign needs this — didn't exist before, only the subscriber list did).
alter table email_subscriptions add column if not exists enabled boolean not null default true;

-- Leave Period configuration (Configure → Leave Period, previously a
-- "not built yet" placeholder) — defines the org's leave/fiscal year.
create table if not exists leave_periods (
  id uuid primary key default gen_random_uuid(),
  start_month text not null,
  start_date date not null,
  end_date date,
  is_current boolean not null default false
);

alter table leave_periods enable row level security;
create policy "authenticated read leave_periods" on leave_periods for select using (auth.role() = 'authenticated');
create policy "authenticated insert leave_periods" on leave_periods for insert with check (auth.role() = 'authenticated');
create policy "authenticated update leave_periods" on leave_periods for update using (auth.role() = 'authenticated');
