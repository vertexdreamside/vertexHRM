-- Vertex HRM — Job Section (HRM Admin spec §1.3).

create table currencies (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  symbol text
);

create table job_titles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  spec_document_id uuid,  -- references documents(id) once §2 Documents exists
  notes text,
  created_at timestamptz not null default now()
);

create table pay_grades (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  currency_id uuid not null references currencies(id),
  min_salary numeric(12,2),
  max_salary numeric(12,2),
  check (max_salary is null or min_salary is null or max_salary >= min_salary)
);

create table employment_statuses (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  enabled boolean not null default true,
  is_default boolean not null default false
);

create table job_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table work_shifts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  from_time time not null,
  to_time time not null
);

alter table currencies enable row level security;
alter table job_titles enable row level security;
alter table pay_grades enable row level security;
alter table employment_statuses enable row level security;
alter table job_categories enable row level security;
alter table work_shifts enable row level security;

create policy "authenticated read currencies" on currencies for select using (auth.role() = 'authenticated');
create policy "authenticated read job_titles" on job_titles for select using (auth.role() = 'authenticated');
create policy "authenticated read pay_grades" on pay_grades for select using (auth.role() = 'authenticated');
create policy "authenticated read employment_statuses" on employment_statuses for select using (auth.role() = 'authenticated');
create policy "authenticated read job_categories" on job_categories for select using (auth.role() = 'authenticated');
create policy "authenticated read work_shifts" on work_shifts for select using (auth.role() = 'authenticated');

insert into currencies (code, name, symbol) values
  ('SCR', 'Seychelles Rupee', '₨'),
  ('USD', 'US Dollar', '$');

-- Default statuses per HRM Admin spec §1.3.3, enabled by default.
insert into employment_statuses (name, enabled, is_default) values
  ('Freelance', true, true),
  ('Full-Time Contract', true, true),
  ('Full-Time Permanent', true, true),
  ('Full-Time Probation', true, true),
  ('Part-Time Contract', true, true),
  ('Part-Time Internship', true, true);
