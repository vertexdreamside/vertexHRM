-- Additional write policies for `leave_requests` ahead of wiring Leave
-- to real queries. Migration 0011 only allowed inserting a request for
-- yourself — Assign Leave (manager recording leave on someone else's
-- behalf, §Leave "Assign Leave" tab) needs to insert for other
-- employees too, and approve/reject/cancel need an UPDATE policy that
-- never existed at all.
--
-- This policy is intentionally broader than the self-scoped one from
-- 0011 (permissive policies OR together, so this supersedes it for
-- now) — same "authenticated baseline, tighten later once real
-- approval-authority scoping from Roles & Permissions exists" pattern
-- used everywhere else in this schema.

create policy "authenticated insert any leave_requests" on leave_requests
  for insert with check (auth.role() = 'authenticated');

create policy "authenticated update leave_requests" on leave_requests
  for update using (auth.role() = 'authenticated');

-- Entitlements tab needs its own table — leave_type_defaults
-- (Compliance §6.4) is the org-wide default; this is where a specific
-- employee's override lives (e.g. a longer contractual entitlement).
-- Never had a table at all before now, same as Localization's gap.
create table employee_leave_entitlements (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id),
  leave_type_id uuid not null references leave_type_defaults(id),
  entitled_days numeric(4,1) not null,
  unique (employee_id, leave_type_id)
);

alter table employee_leave_entitlements enable row level security;

create policy "authenticated read employee_leave_entitlements" on employee_leave_entitlements
  for select using (auth.role() = 'authenticated');
create policy "authenticated insert employee_leave_entitlements" on employee_leave_entitlements
  for insert with check (auth.role() = 'authenticated');
create policy "authenticated update employee_leave_entitlements" on employee_leave_entitlements
  for update using (auth.role() = 'authenticated');
