-- Vertex HRM — Configuration (HRM Admin spec §5).

create table email_config (
  id boolean primary key default true check (id),
  mail_sent_as text not null default 'no-reply@vertexhrm.app',
  sending_method text not null default 'smtp' check (sending_method in ('secure_smtp', 'smtp', 'sendmail')),
  path_to_sendmail text
);
insert into email_config (id) values (true);

create table email_subscriptions (
  id uuid primary key default gen_random_uuid(),
  notification_type text not null unique,
  subscriber_ids uuid[] not null default '{}'
);
insert into email_subscriptions (notification_type) values
  ('Leave Application'), ('Leave Approvals'), ('Leave Assignments'),
  ('Leave Cancellations'), ('Leave Rejections'), ('Permission Change');

create table modules (
  key text primary key,
  name text not null,
  enabled boolean not null default false
);
insert into modules (key, name, enabled) values
  ('admin', 'Admin', true),
  ('pim', 'PIM', false),
  ('leave', 'Leave', true),
  ('time', 'Time', false),
  ('recruitment', 'Recruitment', false),
  ('performance', 'Performance', false),
  ('directory', 'Directory', false),
  ('maintenance', 'Maintenance', false),
  ('mobile', 'Mobile', false),
  ('claims', 'Claims', false),
  ('buzz', 'Buzz', false);

create table social_auth_providers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  client_id text not null,
  provider_url text not null,
  client_secret text not null  -- TODO: move to Supabase Vault rather than plain column before production use
);

-- Password Policy is applied at the application/Supabase-Auth-config
-- level (min length, MFA requirement, session expiry are Supabase Auth
-- settings, not arbitrary app data) — this table stores the subset that
-- isn't natively a Supabase Auth setting, for display/audit purposes.
create table password_policy (
  id boolean primary key default true check (id),
  min_length int not null default 8,
  require_uppercase boolean not null default true,
  require_number boolean not null default true,
  require_special_char boolean not null default false,
  expiry_days int not null default 0,
  lockout_attempts int not null default 5,
  lockout_minutes int not null default 15,
  require_2fa boolean not null default false,
  session_timeout_minutes int not null default 30,
  admin_ip_allowlist text
);
insert into password_policy (id) values (true);

create table custom_fields (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  applies_to text not null check (applies_to in ('Employee', 'Job Title')),
  field_type text not null check (field_type in ('Text', 'Number', 'Date', 'Dropdown', 'Checkbox', 'File')),
  options text[],
  required boolean not null default false
);

create table custom_field_values (
  id uuid primary key default gen_random_uuid(),
  custom_field_id uuid not null references custom_fields(id) on delete cascade,
  record_id uuid not null,
  value text
);

create table tos_documents (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('Terms of Service', 'Privacy Policy', 'Employee Data Consent Notice')),
  content text,
  version int not null default 1,
  effective_date date not null default current_date,
  require_reacceptance boolean not null default false
);

create table tos_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id),
  tos_document_id uuid not null references tos_documents(id),
  accepted_at timestamptz not null default now()
);

alter table email_config enable row level security;
alter table email_subscriptions enable row level security;
alter table modules enable row level security;
alter table social_auth_providers enable row level security;
alter table password_policy enable row level security;
alter table custom_fields enable row level security;
alter table custom_field_values enable row level security;
alter table tos_documents enable row level security;
alter table tos_acceptances enable row level security;

create policy "authenticated read email_config" on email_config for select using (auth.role() = 'authenticated');
create policy "authenticated read email_subscriptions" on email_subscriptions for select using (auth.role() = 'authenticated');
create policy "authenticated read modules" on modules for select using (auth.role() = 'authenticated');
create policy "authenticated read password_policy" on password_policy for select using (auth.role() = 'authenticated');
create policy "authenticated read custom_fields" on custom_fields for select using (auth.role() = 'authenticated');
create policy "authenticated read tos_documents" on tos_documents for select using (auth.role() = 'authenticated');
create policy "read own tos_acceptances" on tos_acceptances for select using (user_id = auth.uid());
-- social_auth_providers holds client_secret — no select policy for
-- regular authenticated users; only accessible via the service_role key
-- from server-side code.
