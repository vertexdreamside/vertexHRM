-- Vertex HRM — Recruitment module.

create table vacancies (
  id uuid primary key default gen_random_uuid(),
  vacancy_name text not null,
  job_title text not null,
  number_of_positions int not null default 1,
  hiring_manager text,
  status text not null default 'Open' check (status in ('Open', 'Closed')),
  created_at timestamptz not null default now()
);

create table candidates (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text,
  vacancy_id uuid references vacancies(id),
  stage text not null default 'Application Received' check (
    stage in ('Application Received', 'Screening', 'Interview Scheduled', 'Interviewed', 'Offer Extended', 'Hired', 'Rejected')
  ),
  applied_date date not null default current_date,
  resume_document_id uuid,  -- references documents(id) once §2 Documents exists
  created_at timestamptz not null default now()
);

create index candidates_vacancy_idx on candidates(vacancy_id);
create index candidates_stage_idx on candidates(stage);

alter table vacancies enable row level security;
alter table candidates enable row level security;

create policy "authenticated read vacancies" on vacancies for select using (auth.role() = 'authenticated');
create policy "authenticated read candidates" on candidates for select using (auth.role() = 'authenticated');
