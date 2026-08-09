-- Interactive onboarding tour — tracks whether each user has already
-- seen it, so it only auto-launches once, with a manual "Restart Tour"
-- option (Help Centre) available any time after that.
alter table app_users add column if not exists has_seen_tour boolean not null default false;
