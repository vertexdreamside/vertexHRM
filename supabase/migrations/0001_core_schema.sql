-- Vertex HRM — core schema, migration 0001
-- Covers the "Shared Platform Layer" from vertex-core-data-model.md §1.
-- Later migrations add HRM (§2) and Admin Ops (§3) tables on top of this.

create extension if not exists "pgcrypto";

-- Roles are seeded from the Vertex Suite — Access Levels & Role Definitions
-- doc. System Administrator and Employee are protected in application code
-- (not deletable), everything else is a fully editable starter template.
create table roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  is_system boolean not null default false,
  created_at timestamptz not null default now()
);

-- One row per (role, module, action) grant — the Permission Matrix in
-- HRM Admin spec §1.2 reads/writes this table.
create table role_permissions (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references roles(id) on delete cascade,
  module text not null,               -- e.g. 'admin', 'leave', 'it_support'
  can_view boolean not null default false,
  can_add boolean not null default false,
  can_edit boolean not null default false,
  can_delete boolean not null default false,
  can_approve boolean not null default false,
  unique (role_id, module)
);

create table departments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  parent_id uuid references departments(id) on delete set null,
  created_at timestamptz not null default now()
);

create table locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country text,
  island text,
  phone text,
  created_at timestamptz not null default now()
);

-- Employee master record. `id` matches auth.users.id once an employee
-- has a login — kept separate so an employee can exist before their
-- account is provisioned (see HRM Admin spec §1.1: "an employee list
-- needs to exist before a user login can be created").
create table employees (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  department_id uuid references departments(id),
  job_title text,
  location_id uuid references locations(id),
  email text,
  phone text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now()
);

-- App-level user record, one-to-one with a Supabase auth user.
create table app_users (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  employee_id uuid references employees(id),
  role_id uuid not null references roles(id),
  status text not null default 'enabled' check (status in ('enabled', 'disabled')),
  created_at timestamptz not null default now()
);

-- Append-only. No update/delete grants for any role, including admins —
-- enforced below via RLS, matching HRM Admin spec §5.10.
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references app_users(id),
  action text not null,               -- Login/Logout/Create/Update/Delete/...
  module text,
  details jsonb,
  ip_address text,
  created_at timestamptz not null default now()
);

create index audit_log_user_id_idx on audit_log(user_id);
create index audit_log_created_at_idx on audit_log(created_at desc);

-- Shared inbox summary row — Admin Ops spec §16.
create table inbox_items (
  id uuid primary key default gen_random_uuid(),
  source_module text not null,        -- 'leave' | 'requests' | 'it_ticket' | 'expense' | 'procurement'
  source_id uuid not null,
  title text not null,
  owner_id uuid not null references app_users(id),
  current_actor_id uuid references app_users(id),
  status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index inbox_items_current_actor_idx on inbox_items(current_actor_id, status);
create index inbox_items_owner_idx on inbox_items(owner_id);

-- Row Level Security -------------------------------------------------

alter table roles enable row level security;
alter table role_permissions enable row level security;
alter table departments enable row level security;
alter table locations enable row level security;
alter table employees enable row level security;
alter table app_users enable row level security;
alter table audit_log enable row level security;
alter table inbox_items enable row level security;

-- Baseline: any authenticated user can read reference/lookup data.
-- Tighten per-module as each module's spec is implemented.
create policy "authenticated read roles" on roles
  for select using (auth.role() = 'authenticated');
create policy "authenticated read departments" on departments
  for select using (auth.role() = 'authenticated');
create policy "authenticated read locations" on locations
  for select using (auth.role() = 'authenticated');

-- A user can always read their own app_users row.
create policy "read own app_user" on app_users
  for select using (id = auth.uid());

-- Audit log: insert-only for authenticated users, no update/delete policy
-- exists for anyone — that omission IS the enforcement.
create policy "authenticated insert audit_log" on audit_log
  for insert with check (auth.role() = 'authenticated');
create policy "authenticated read audit_log" on audit_log
  for select using (auth.role() = 'authenticated');

-- Inbox items: visible to the owner or the current actor only.
create policy "read own inbox items" on inbox_items
  for select using (owner_id = auth.uid() or current_actor_id = auth.uid());

-- NOTE: the policies above are a starting point, not the final
-- permission model — HRM Admin §1.2's Roles & Permissions screen is
-- meant to drive row/column-level access more granularly than this
-- migration can express alone. Revisit once that screen writes to
-- role_permissions in practice.
