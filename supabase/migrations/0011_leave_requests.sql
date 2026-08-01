-- Vertex HRM — Leave module.
-- `leave_type_defaults` already exists from Compliance (0009) and holds
-- the statutory-minimum-aware entitlement config; this migration adds
-- the actual request/approval table that consumes those entitlements.

create table leave_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id),
  leave_type_id uuid not null references leave_type_defaults(id),
  from_date date not null,
  to_date date not null,
  days numeric(4,1) not null,
  status text not null default 'Pending' check (status in ('Pending', 'Approved', 'Rejected', 'Cancelled')),
  reason text,
  decided_by uuid references app_users(id),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  check (to_date >= from_date)
);

create index leave_requests_employee_idx on leave_requests(employee_id);
create index leave_requests_status_idx on leave_requests(status);

alter table leave_requests enable row level security;

-- An employee sees their own requests; a full "sees their team's
-- requests too" policy needs the reporting-line/department scoping
-- from Roles & Permissions (§1.2) wired in — left as authenticated-read
-- for now, same caveat as migration 0001's baseline policies.
create policy "authenticated read leave_requests" on leave_requests
  for select using (auth.role() = 'authenticated');
create policy "authenticated insert own leave_requests" on leave_requests
  for insert with check (
    employee_id in (select employee_id from app_users where id = auth.uid())
  );
