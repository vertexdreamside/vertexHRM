-- Default seed data (Job Titles, Job Categories, expanded Qualifications)
-- plus a richer Pay Grades structure and the Seychelles-specific
-- Sick Leave for Sick Child provision.

-- ---------------------------------------------------------------------
-- Job Titles — never seeded before, table has always been empty.
-- ---------------------------------------------------------------------
insert into job_titles (title) values
  ('Chief Executive Officer (CEO)'), ('Managing Director'), ('Director'), ('General Manager'),
  ('Deputy General Manager'), ('Operations Manager'), ('Finance Manager'), ('Human Resources Manager'),
  ('IT Manager'), ('Administrative Manager'), ('Sales Manager'), ('Marketing Manager'), ('Project Manager'),
  ('Supervisor'), ('Team Leader'), ('Officer'), ('Administrator'), ('Accountant'),
  ('Human Resources Officer'), ('IT Officer'), ('Receptionist'), ('Assistant'), ('Clerk'),
  ('Technician'), ('Driver'), ('Intern'), ('Other')
on conflict do nothing;

-- ---------------------------------------------------------------------
-- Job Categories — also never seeded.
-- ---------------------------------------------------------------------
insert into job_categories (name) values
  ('Management'), ('Executive'), ('Administration'), ('Finance & Accounting'), ('Human Resources'),
  ('Information Technology'), ('Sales'), ('Marketing'), ('Operations'), ('Customer Service'),
  ('Engineering'), ('Technical'), ('Legal'), ('Education'), ('Healthcare'), ('Security'),
  ('Transport'), ('Maintenance'), ('Hospitality'), ('Skilled Labour'), ('Unskilled Labour'),
  ('Intern / Trainee'), ('Temporary'), ('Contract'), ('Other')
on conflict (name) do nothing;

-- ---------------------------------------------------------------------
-- Qualifications — expand what's already seeded (education/languages
-- only had 4/3 entries), add certificates and secondary-level items
-- that never existed as a category before.
-- ---------------------------------------------------------------------
insert into qualification_items (list_type, name) values
  ('education', 'S4'), ('education', 'S5'), ('education', 'IGCSE'), ('education', 'GCSE'), ('education', 'A-Level'),
  ('education', 'Advanced Diploma'), ('education', 'Higher Diploma'), ('education', 'Associate Degree'),
  ('education', 'Honours Bachelor''s Degree'), ('education', 'Doctorate / PhD'),
  ('certificates', 'Certificate'), ('certificates', 'Professional Certificate'), ('certificates', 'Technical Certificate'),
  ('certificates', 'Professional Qualification'), ('certificates', 'Professional Certification'), ('certificates', 'Other')
on conflict (list_type, name) do nothing;

-- ---------------------------------------------------------------------
-- Pay Grades — richer structure matching request: Band/Step, Basic
-- Salary, Effective Date, Status, Description alongside the existing
-- Min/Max/Currency. NOT seeding exact salary figures for all 300
-- Band x Step combinations — that's real civil service pay data, and
-- inventing numbers not verified against the actual 2025 circular
-- would risk presenting fabricated figures as authoritative. Seeding
-- the real 20-band structure with figures left for an administrator
-- to fill in from the official circular (a link is in the app's
-- description field pointing to where to find it).
-- ---------------------------------------------------------------------
alter table pay_grades add column if not exists step int;
alter table pay_grades add column if not exists basic_salary numeric(12,2);
alter table pay_grades add column if not exists effective_date date;
alter table pay_grades add column if not exists status text not null default 'Active' check (status in ('Active', 'Inactive'));
alter table pay_grades add column if not exists description text;

do $$
declare
  scr_id uuid;
  i int;
begin
  select id into scr_id from currencies where code = 'SCR' limit 1;
  if scr_id is not null then
    for i in 1..20 loop
      insert into pay_grades (name, currency_id, effective_date, description)
      values (
        'Band ' || i, scr_id, '2025-04-01',
        'Seychelles Public Service Salary Table, Band ' || i || ' of 20 (15 steps per band). ' ||
        'Figures not pre-filled — confirm against the official 2025 Public Service Salary Review circular before use.'
      )
      on conflict do nothing;
    end loop;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- Sick Leave for Sick Child (Seychelles) — a real, distinct provision,
-- not folded into ordinary sick leave. Configurable, not hard-coded:
-- admins can adjust the day limit/age limit if legislation changes.
-- ---------------------------------------------------------------------
alter table leave_type_defaults add column if not exists child_age_limit int;
alter table leave_type_defaults add column if not exists requires_medical_certification boolean not null default false;
alter table leave_type_defaults add column if not exists is_separate_entitlement boolean not null default false;
alter table leave_type_defaults add column if not exists applicable_country text;

insert into leave_type_defaults (name, statutory_minimum_days, configured_days, notes, child_age_limit, requires_medical_certification, is_separate_entitlement, applicable_country, is_situational)
values (
  'Sick Leave - Child Care', 7, 7,
  'Seychelles Employment (Conditions of Employment) Regulations: up to 7 days, separate from the worker''s own sick leave entitlement, where a child under 12 is medically certified sick and a medical practitioner/authorized health official recommends the worker attend to the child. Verify current terms against SeyLII before relying on this for an actual case.',
  12, true, true, 'Seychelles', true
)
on conflict (name) do nothing;

-- ---------------------------------------------------------------------
-- PIM Employee Status — the existing employees.status (active/inactive)
-- already drives access-control logic in several places throughout the
-- app (Sidebar, filters, bulk actions) and changing its meaning would
-- risk breaking that. Adding a separate, richer classification for HR
-- reporting purposes instead of overloading the existing column.
-- ---------------------------------------------------------------------
alter table employees add column if not exists lifecycle_status text not null default 'Active' check (lifecycle_status in (
  'Active', 'Inactive', 'On Leave', 'Suspended', 'Terminated', 'Resigned', 'Retired', 'Contract Expired', 'Deceased', 'Other'
));

-- ---------------------------------------------------------------------
-- GOP (Gainful Occupation Permit) — expanding the existing work_permits
-- table (already had gop_number + expiry_date) with the rest of the
-- requested fields rather than creating a duplicate table.
-- ---------------------------------------------------------------------
alter table work_permits add column if not exists issue_date date;
alter table work_permits add column if not exists occupation text;
alter table work_permits add column if not exists employer text;
alter table work_permits add column if not exists issuing_authority text;
alter table work_permits add column if not exists notes text;
alter table work_permits add column if not exists document_url text;

insert into storage.buckets (id, name, public)
values ('gop-documents', 'gop-documents', false)
on conflict (id) do nothing;

-- Private bucket — only authenticated users go through the app's own
-- permission checks before ever reaching a signed URL; no public policy.
create policy "authenticated read gop-documents bucket" on storage.objects for select using (bucket_id = 'gop-documents' and auth.role() = 'authenticated');
create policy "authenticated upload gop-documents bucket" on storage.objects for insert with check (bucket_id = 'gop-documents' and auth.role() = 'authenticated');
create policy "authenticated delete gop-documents bucket" on storage.objects for delete using (bucket_id = 'gop-documents' and auth.role() = 'authenticated');

-- Maintenance Purge Records — targeted purge (specific employee/candidate
-- records by ID, found via search) needs older_than to be nullable;
-- it was only ever used for the date-range bulk purge mode before.
alter table maintenance_purge_log alter column older_than drop not null;
