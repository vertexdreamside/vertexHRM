-- Vertex HRM — PIM (Personal Information Management).
-- Extends the minimal `employees` table from migration 0001 (which only
-- had full_name/department/job_title/location/email/phone/status) with
-- the full personal-details fields PIM actually needs.

alter table employees
  add column if not exists employee_code text unique,
  add column if not exists date_of_birth date,
  add column if not exists gender text check (gender in ('Male', 'Female')),
  add column if not exists marital_status text check (marital_status in ('Single', 'Married', 'Other')),
  add column if not exists nationality text,
  add column if not exists employment_status text,
  add column if not exists date_joined date,
  add column if not exists address text,
  add column if not exists emergency_contact_name text,
  add column if not exists emergency_contact_phone text,
  add column if not exists emergency_contact_relationship text;

-- `employees.status` already exists (active/inactive) from migration
-- 0001 — reused here rather than adding a duplicate column.
