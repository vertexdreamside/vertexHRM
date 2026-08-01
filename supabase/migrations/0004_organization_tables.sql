-- Vertex HRM — Organization module (HRM Admin spec §2).
-- `departments` and `locations` already exist from migration 0001
-- (the shared platform layer references them); this migration adds
-- the single-row company profile and the holiday calendar.

create table organization_profile (
  id boolean primary key default true check (id),  -- enforces a single row
  organization_name text not null,
  registration_number text,
  spf_employer_number text,          -- §6.2 statutory registration
  src_tax_number text,               -- §6.2 statutory registration
  phone text,
  email text,
  address_1 text,
  address_2 text,
  island text,
  district text,
  country text default 'Seychelles',
  notes text,
  updated_at timestamptz not null default now()
);

create table holidays (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  date date not null,
  recurring boolean not null default true,
  location_id uuid references locations(id), -- null = applies to all locations
  created_at timestamptz not null default now()
);

alter table organization_profile enable row level security;
alter table holidays enable row level security;

create policy "authenticated read organization_profile" on organization_profile
  for select using (auth.role() = 'authenticated');
create policy "authenticated read holidays" on holidays
  for select using (auth.role() = 'authenticated');

-- Seeded per HRM Admin spec §6.3 — review yearly, dates shift.
insert into holidays (name, date, recurring) values
  ('New Year''s Day', '2026-01-01', true),
  ('Constitution Day', '2026-06-18', true),
  ('Independence Day', '2026-06-29', true),
  ('Christmas Day', '2026-12-25', true);
