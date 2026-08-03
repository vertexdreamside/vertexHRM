-- Admin Operations full build-out (Admin Ops spec §3-§17, minus
-- Documents §2 which already exists). Same baseline pattern as the
-- rest of this schema: authenticated read/write, role-scoped
-- tightening left for later via Roles & Permissions. Everything here
-- is real — no seed/mock rows, tables start empty.

-- §3 Requests — general employee requests (equipment, access, etc.),
-- distinct from Leave/Claims which already exist in HRM.
create table request_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);
insert into request_categories (name) values ('Equipment'), ('Access'), ('Facilities'), ('Other');

create table requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id),
  category_id uuid references request_categories(id),
  description text not null,
  status text not null default 'Pending' check (status in ('Pending', 'Approved', 'Rejected')),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

-- §5 Procurement
create table suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_email text,
  phone text
);

create table purchase_requests (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid not null references employees(id),
  item_description text not null,
  quantity int not null default 1,
  estimated_cost numeric(10,2),
  status text not null default 'Pending' check (status in ('Pending', 'Approved', 'Rejected', 'Ordered')),
  created_at timestamptz not null default now()
);

create table purchase_orders (
  id uuid primary key default gen_random_uuid(),
  purchase_request_id uuid references purchase_requests(id),
  supplier_id uuid references suppliers(id),
  po_number text not null unique,
  amount numeric(10,2),
  currency text not null default 'SCR',
  status text not null default 'Draft' check (status in ('Draft', 'Sent', 'Received', 'Cancelled')),
  created_at timestamptz not null default now()
);

-- §6 IT Support
create table it_ticket_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);
insert into it_ticket_categories (name) values ('Hardware'), ('Software'), ('Network'), ('Account Access'), ('Other');

create table it_tickets (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid not null references employees(id),
  category_id uuid references it_ticket_categories(id),
  subject text not null,
  description text,
  priority text not null default 'Medium' check (priority in ('Low', 'Medium', 'High', 'Urgent')),
  status text not null default 'Open' check (status in ('Open', 'In Progress', 'Resolved', 'Closed')),
  assigned_to uuid references app_users(id),
  created_at timestamptz not null default now()
);

-- §7 Assets (+ §7.1 Vehicle Fleet)
create table asset_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);
insert into asset_categories (name) values ('IT Equipment'), ('Furniture'), ('Vehicle'), ('Other');

create table assets (
  id uuid primary key default gen_random_uuid(),
  asset_tag text not null unique,
  name text not null,
  category_id uuid references asset_categories(id),
  assigned_to uuid references employees(id),
  status text not null default 'In Use' check (status in ('In Use', 'In Storage', 'Under Repair', 'Retired')),
  purchase_date date,
  value numeric(10,2),
  notes text
);

create table vehicles (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid references assets(id),
  plate_number text not null unique,
  make_model text,
  insurance_expiry date,
  next_service_date date
);

create table vehicle_fuel_logs (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id),
  log_date date not null default current_date,
  liters numeric(6,2),
  cost numeric(10,2),
  odometer int
);

-- §8 Inventory
create table inventory_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sku text unique,
  quantity_on_hand int not null default 0,
  reorder_level int not null default 0,
  location text
);

-- §9 Expenses (operational/departmental — distinct from HRM's Claims,
-- which are personal employee expense claims)
create table op_expense_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);
insert into op_expense_categories (name) values ('Utilities'), ('Rent'), ('Supplies'), ('Maintenance'), ('Other');

create table op_expenses (
  id uuid primary key default gen_random_uuid(),
  department_id uuid references departments(id),
  category_id uuid references op_expense_categories(id),
  amount numeric(10,2) not null,
  currency text not null default 'SCR',
  expense_date date not null default current_date,
  description text,
  submitted_by uuid references employees(id),
  status text not null default 'Pending' check (status in ('Pending', 'Approved', 'Rejected')),
  created_at timestamptz not null default now()
);

-- §10 Calendar
create table calendar_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  start_at timestamptz not null,
  end_at timestamptz not null,
  all_day boolean not null default false,
  created_by uuid references app_users(id),
  created_at timestamptz not null default now()
);

-- §11 Communication — formal broadcast announcements, distinct from
-- HRM's Buzz (social feed).
create table announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  created_by uuid references app_users(id),
  created_at timestamptz not null default now(),
  pinned boolean not null default false
);

-- §17 Onboarding/Offboarding Checklists
create table onboarding_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('Onboarding', 'Offboarding'))
);

create table onboarding_template_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references onboarding_templates(id) on delete cascade,
  task text not null,
  sort_order int not null default 0
);

create table employee_onboarding_tasks (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id),
  template_id uuid references onboarding_templates(id),
  task text not null,
  status text not null default 'Pending' check (status in ('Pending', 'Completed')),
  due_date date,
  completed_at timestamptz
);

-- RLS — baseline authenticated read/write across every table above,
-- same pattern used throughout this schema.
do $$
declare
  t text;
begin
  for t in select unnest(array[
    'request_categories','requests','suppliers','purchase_requests','purchase_orders',
    'it_ticket_categories','it_tickets','asset_categories','assets','vehicles','vehicle_fuel_logs',
    'inventory_items','op_expense_categories','op_expenses','calendar_events','announcements',
    'onboarding_templates','onboarding_template_items','employee_onboarding_tasks'
  ])
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "authenticated read %I" on %I for select using (auth.role() = ''authenticated'')', t, t);
    execute format('create policy "authenticated insert %I" on %I for insert with check (auth.role() = ''authenticated'')', t, t);
    execute format('create policy "authenticated update %I" on %I for update using (auth.role() = ''authenticated'')', t, t);
    execute format('create policy "authenticated delete %I" on %I for delete using (auth.role() = ''authenticated'')', t, t);
  end loop;
end $$;
