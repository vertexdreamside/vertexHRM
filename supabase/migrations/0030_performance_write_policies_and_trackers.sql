-- Write policies for Performance ahead of wiring it to real queries,
-- plus a new performance_trackers table for My/Employee Trackers
-- (added during the nav restructure with no table behind it yet).
--
-- 13th Month Salary and Appraisal are deliberately NOT given tables
-- here. 13th Month needs an actual per-employee salary figure to
-- calculate eligibility/amount off of, and `employees` only stores a
-- pay_grade band (min/max), not an individual salary — adding that
-- properly is a payroll-scoped decision, not a quick column add.
-- Appraisal is a free-text draft with no defined destination (attach
-- to a review? stand alone?) — better to leave both honestly on seed
-- data than force a shape that'll likely need to change.

create policy "authenticated insert performance_kpis" on performance_kpis
  for insert with check (auth.role() = 'authenticated');
create policy "authenticated delete performance_kpis" on performance_kpis
  for delete using (auth.role() = 'authenticated');

create policy "authenticated insert performance_reviews" on performance_reviews
  for insert with check (auth.role() = 'authenticated');
create policy "authenticated update performance_reviews" on performance_reviews
  for update using (auth.role() = 'authenticated');

create table performance_trackers (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id),
  goal text not null,
  progress int not null default 0 check (progress between 0 and 100),
  created_at timestamptz not null default now()
);

alter table performance_trackers enable row level security;

create policy "authenticated read performance_trackers" on performance_trackers
  for select using (auth.role() = 'authenticated');
create policy "authenticated insert performance_trackers" on performance_trackers
  for insert with check (auth.role() = 'authenticated');
create policy "authenticated update performance_trackers" on performance_trackers
  for update using (auth.role() = 'authenticated');
