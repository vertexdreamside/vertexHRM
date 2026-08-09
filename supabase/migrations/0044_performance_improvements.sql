-- Performance improvements, researched: two consistently-cited gaps
-- across current performance-management platforms (PerformYard,
-- Lattice, Profit.co, Engagedly) that weren't covered by the earlier
-- Goals/Check-Ins round:
--
-- 1. Goal completion data should surface directly inside the review
--    itself, not be reconstructed from memory. Reviews currently have
--    no detail view at all — just a single overall-rating number.
-- 2. Goal cascading (individual goals linking up to team/company
--    objectives) — performance_goals.parent_goal_id already existed
--    from migration 0042 but nothing in the UI ever used it.
--
-- Deliberately not building: AI-generated review summaries, 9-box
-- grids, flight-risk analytics, calibration sessions — each is its
-- own real subsystem, same reasoning as the earlier scoping decision.

create table performance_review_ratings (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references performance_reviews(id) on delete cascade,
  kpi_id uuid not null references performance_kpis(id),
  rating numeric,
  comment text,
  unique (review_id, kpi_id)
);

alter table performance_review_ratings enable row level security;
create policy "authenticated read performance_review_ratings" on performance_review_ratings for select using (auth.role() = 'authenticated');
create policy "authenticated insert performance_review_ratings" on performance_review_ratings for insert with check (auth.role() = 'authenticated');
create policy "authenticated update performance_review_ratings" on performance_review_ratings for update using (auth.role() = 'authenticated');
