-- Vertex HRM — Claims module.

create table claim_events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  active boolean not null default true
);
insert into claim_events (name) values ('Accommodation'), ('Medical Reimbursement'), ('Travel Allowance');

create table claim_expense_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  active boolean not null default true
);
insert into claim_expense_types (name) values ('Accommodation'), ('Fuel Allowance'), ('Transport');

create table claims (
  id uuid primary key default gen_random_uuid(),
  reference_id text not null unique,
  employee_id uuid not null references employees(id),
  event_id uuid not null references claim_events(id),
  currency text not null default 'SCR',
  status text not null default 'Initiated' check (status in ('Initiated', 'Submitted', 'Approved', 'Rejected', 'Cancelled')),
  remarks text,
  decided_by uuid references app_users(id),
  decided_at timestamptz,
  submitted_date date not null default current_date
);

create table claim_expense_lines (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references claims(id) on delete cascade,
  expense_type_id uuid not null references claim_expense_types(id),
  expense_date date not null,
  amount numeric(10,2) not null check (amount > 0),
  note text,
  receipt_document_id uuid  -- references documents(id) once §2 Documents exists
);

alter table claim_events enable row level security;
alter table claim_expense_types enable row level security;
alter table claims enable row level security;
alter table claim_expense_lines enable row level security;

create policy "authenticated read claim_events" on claim_events for select using (auth.role() = 'authenticated');
create policy "authenticated read claim_expense_types" on claim_expense_types for select using (auth.role() = 'authenticated');
create policy "authenticated read claims" on claims for select using (auth.role() = 'authenticated');
create policy "authenticated read claim_expense_lines" on claim_expense_lines for select using (auth.role() = 'authenticated');
create policy "authenticated insert own claims" on claims
  for insert with check (
    employee_id in (select employee_id from app_users where id = auth.uid())
  );
