-- Performance module: Goals & OKRs and Quarterly Check-Ins — the two
-- pieces that create real continuous performance management, per the
-- reviewed proposal. Deliberately NOT building 360 feedback, PIP,
-- probation review, competency libraries, or weighted-template
-- scoring in this pass — each is a real subsystem on its own and a
-- shallow version of all of them would be worse than a smaller set
-- that actually works. See notes in chat.

create table performance_goals (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id),
  manager_id uuid references employees(id),
  reviewer_id uuid references employees(id),
  parent_goal_id uuid references performance_goals(id),
  title text not null,
  description text,
  goal_type text not null default 'Individual' check (goal_type in (
    'Individual Goal', 'Department Goal', 'Company Goal', 'Development Goal', 'Project Goal', 'KPI Goal', 'Operational Goal'
  )),
  department_id uuid references departments(id),
  start_date date,
  due_date date,
  priority text not null default 'Medium' check (priority in ('Low', 'Medium', 'High')),
  weight int not null default 0 check (weight >= 0 and weight <= 100),
  status text not null default 'Draft' check (status in (
    'Draft', 'Pending Approval', 'Active', 'In Progress', 'At Risk', 'On Hold',
    'Achieved', 'Partially Achieved', 'Not Achieved', 'Cancelled'
  )),
  measurement_method text,
  target_value numeric,
  current_value numeric default 0,
  notes text,
  created_at timestamptz not null default now()
);

-- Progress % is derived (target/current), not stored, so it can never
-- drift out of sync with the values it's computed from — allowed to
-- exceed 100 (spec's "allow goals to exceed 100% where exceeded").

alter table performance_goals enable row level security;
create policy "authenticated read performance_goals" on performance_goals for select using (auth.role() = 'authenticated');
create policy "authenticated insert performance_goals" on performance_goals for insert with check (auth.role() = 'authenticated');
create policy "authenticated update performance_goals" on performance_goals for update using (auth.role() = 'authenticated');
create policy "authenticated delete performance_goals" on performance_goals for delete using (auth.role() = 'authenticated');

-- Goal change history — satisfies "changing a goal must preserve the
-- previous version" without a full generic audit-trail subsystem: one
-- row per edit, storing what changed.
create table performance_goal_history (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references performance_goals(id) on delete cascade,
  changed_by uuid references app_users(id),
  previous_state jsonb not null,
  reason text,
  created_at timestamptz not null default now()
);

alter table performance_goal_history enable row level security;
create policy "authenticated read performance_goal_history" on performance_goal_history for select using (auth.role() = 'authenticated');
create policy "authenticated insert performance_goal_history" on performance_goal_history for insert with check (auth.role() = 'authenticated');

create table quarterly_checkins (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id),
  manager_id uuid references employees(id),
  quarter text not null,
  employee_reflection text,
  manager_summary text,
  achievements text,
  areas_for_attention text,
  support_required text,
  priorities_next_quarter text,
  outcome text check (outcome in ('On Track', 'Needs Attention', 'At Risk', 'Exceeding Expectations')),
  employee_ack_at timestamptz,
  manager_ack_at timestamptz,
  created_at timestamptz not null default now(),
  unique (employee_id, quarter)
);

alter table quarterly_checkins enable row level security;
create policy "authenticated read quarterly_checkins" on quarterly_checkins for select using (auth.role() = 'authenticated');
create policy "authenticated insert quarterly_checkins" on quarterly_checkins for insert with check (auth.role() = 'authenticated');
create policy "authenticated update quarterly_checkins" on quarterly_checkins for update using (auth.role() = 'authenticated');
