-- PIM improvement, researched: skills/certification tracking with
-- expiry alerts is the single most consistently cited valuable HRIS
-- feature right now (AG5, MuchSkills, iMocha, MangoApps all center
-- their whole product on this). My Info's Work Experience, Education,
-- Skills, and Memberships sections were all fake local React state
-- with seeded placeholder data — never persisted, lost on refresh.
-- Real tables now, with expiry fields on Skills/Certifications and
-- Memberships specifically so an expiry-alerts view is possible.

create table employee_work_experience (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  company text not null,
  job_title text,
  from_date date,
  to_date date,
  comment text
);

create table employee_education (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  level text not null,
  year text,
  gpa text
);

create table employee_skills (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  skill_name text not null,
  category text not null default 'Skill' check (category in ('Skill', 'Language', 'Certification', 'License')),
  proficiency_level text check (proficiency_level in ('Beginner', 'Intermediate', 'Advanced', 'Expert')),
  issuing_body text,
  issued_date date,
  expiry_date date
);

create table employee_memberships (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  membership_name text not null,
  subscription_paid_by text,
  subscription_amount numeric(10,2),
  currency text default 'SCR',
  commence_date date,
  renewal_date date
);

do $$
declare
  t text;
begin
  for t in select unnest(array['employee_work_experience', 'employee_education', 'employee_skills', 'employee_memberships'])
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "authenticated read %I" on %I for select using (auth.role() = ''authenticated'')', t, t);
    execute format('create policy "authenticated insert %I" on %I for insert with check (auth.role() = ''authenticated'')', t, t);
    execute format('create policy "authenticated delete %I" on %I for delete using (auth.role() = ''authenticated'')', t, t);
  end loop;
end $$;
