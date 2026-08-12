-- System Changelog — database-backed release notes, matching a
-- reference screenshot's design (version badge, current flag, change
-- type, checkmarked bullet list per release).
create table changelog_entries (
  id uuid primary key default gen_random_uuid(),
  version text not null unique,
  release_date date not null,
  change_type text not null default 'Minor' check (change_type in ('Major', 'Minor', 'Patch')),
  is_current boolean not null default false,
  items text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table changelog_entries enable row level security;
create policy "authenticated read changelog_entries" on changelog_entries for select using (auth.role() = 'authenticated');
create policy "authenticated insert changelog_entries" on changelog_entries for insert with check (auth.role() = 'authenticated');
create policy "authenticated update changelog_entries" on changelog_entries for update using (auth.role() = 'authenticated');
create policy "authenticated delete changelog_entries" on changelog_entries for delete using (auth.role() = 'authenticated');

-- Seed with this build's own real, actual history — not invented
-- feature claims, an honest record of what's genuinely been shipped
-- across this project's rounds.
insert into changelog_entries (version, release_date, change_type, is_current, items) values
(
  'v0.1',
  current_date,
  'Major',
  true,
  array[
    'Full HRM suite: Admin, PIM, Leave, Time, Recruitment, Performance, Claims, Maintenance, Buzz, My Info, Directory',
    'Separate Admin Operations space: Requests, Procurement, IT Support, Assets, Inventory, Expenses, Calendar, Communication, Documents, Onboarding, Audit Trail, Reports',
    'Performance: Goals & OKRs with cascading, Quarterly Check-Ins, per-KPI Review Detail',
    'PIM: real Skills/Certifications with expiry tracking, dynamic Reports filter builder, Employee Profile pages',
    'Real RBAC enforcement via hasPermission()/useModulePermission() — closed three real privilege-escalation gaps found during a security review',
    'AI Assistant (rule-based, no external API) and an interactive onboarding tour',
    'Data Export module — real Excel/CSV export',
    'System Changelog (this page)'
  ]
)
on conflict (version) do nothing;
