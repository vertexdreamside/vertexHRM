-- Performance restructure to match the actual reference UI:
-- - KPIs are scored by Min Rate/Max Rate/Is Default per job title, not
--   a weight percentage (migration 0014's original shape was wrong).
-- - Reviews need a Due Date, which was never captured before.

alter table performance_kpis drop column if exists weight;
alter table performance_kpis add column if not exists min_rate int not null default 0;
alter table performance_kpis add column if not exists max_rate int not null default 100;
alter table performance_kpis add column if not exists is_default boolean not null default false;

alter table performance_reviews add column if not exists due_date date;

-- Configure → Trackers: not detailed in the reference screenshots, but
-- the dropdown item needs a real destination rather than a dead link —
-- a simple reusable goal-template catalog, same generic-list pattern
-- used elsewhere (job_categories, claim_events, etc.).
create table if not exists performance_tracker_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

alter table performance_tracker_templates enable row level security;
create policy "authenticated read performance_tracker_templates" on performance_tracker_templates for select using (auth.role() = 'authenticated');
create policy "authenticated insert performance_tracker_templates" on performance_tracker_templates for insert with check (auth.role() = 'authenticated');
create policy "authenticated delete performance_tracker_templates" on performance_tracker_templates for delete using (auth.role() = 'authenticated');

-- Time module restructure (Project Info → Customers) — same generic
-- catalog pattern as timesheet_projects (migration 0012).
create table if not exists timesheet_customers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

alter table timesheet_customers enable row level security;
create policy "authenticated read timesheet_customers" on timesheet_customers for select using (auth.role() = 'authenticated');
create policy "authenticated insert timesheet_customers" on timesheet_customers for insert with check (auth.role() = 'authenticated');
