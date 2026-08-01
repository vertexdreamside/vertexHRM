-- Vertex HRM — Performance module.

create table performance_kpis (
  id uuid primary key default gen_random_uuid(),
  job_title text not null,
  kpi_name text not null,
  weight int not null check (weight > 0 and weight <= 100)
);

create table performance_reviews (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id),
  reviewer_id uuid references app_users(id),
  review_period text not null,
  status text not null default 'Draft' check (status in ('Draft', 'In Progress', 'Completed')),
  overall_rating int check (overall_rating between 1 and 5),
  created_at timestamptz not null default now()
);

alter table performance_kpis enable row level security;
alter table performance_reviews enable row level security;

create policy "authenticated read performance_kpis" on performance_kpis for select using (auth.role() = 'authenticated');
create policy "authenticated read performance_reviews" on performance_reviews for select using (auth.role() = 'authenticated');
