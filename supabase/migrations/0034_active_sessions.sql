-- Active Sessions (Configuration §5.9) — the one gap flagged that
-- Supabase genuinely can't do "for free": there's no clean, documented
-- way to list a user's active JWT sessions with device/IP metadata or
-- revoke one specific device from an admin panel using vanilla
-- Supabase Auth. Rather than fabricate an API call that may not exist,
-- this uses a well-established, verifiable pattern instead:
--
-- 1. `user_sessions` — a real log, written to at login and logout, so
--    "who's logged in, from what device, since when" is genuine data,
--    not illustrative.
-- 2. `app_users.force_logout_after` — an admin sets this to "now"
--    to force a user out. Every dashboard page load (see
--    app/(dashboard)/layout.tsx) decodes the current session's JWT
--    `iat` and compares it against this timestamp; if the session was
--    issued before the force-logout time (or the account is
--    disabled), it's signed out server-side and redirected to login.
--    This can't target one specific device — it's "force logout
--    everywhere for this person" — which is what "disable this user"
--    (§1.1) always should have done and didn't (a gap noted back when
--    Users was first wired).

alter table app_users add column if not exists force_logout_after timestamptz;

create table user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id),
  device_info text,
  login_at timestamptz not null default now(),
  logout_at timestamptz
);

create index user_sessions_user_idx on user_sessions(user_id);

alter table user_sessions enable row level security;

create policy "authenticated read user_sessions" on user_sessions
  for select using (auth.role() = 'authenticated');
create policy "authenticated insert own user_sessions" on user_sessions
  for insert with check (user_id = auth.uid());
create policy "authenticated update own user_sessions" on user_sessions
  for update using (user_id = auth.uid());
