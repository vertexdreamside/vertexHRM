-- Write policies for Configuration (HRM Admin spec §5) ahead of wiring
-- most of its tabs to real queries. Every table in migration 0008 only
-- ever had a SELECT policy (or, for social_auth_providers, no policy
-- at all — deliberately, since it holds client_secret; that one stays
-- server-only via an API route rather than getting a client policy).
--
-- Also adds `localization_settings`, which migration 0008 never
-- created a table for at all — the Localization tab was UI-only from
-- the start with nowhere to persist to.

create table localization_settings (
  id boolean primary key default true check (id),
  language text not null default 'en',
  date_format text not null default 'dd-mm-yyyy'
);
insert into localization_settings (id) values (true);

alter table localization_settings enable row level security;
create policy "authenticated read localization_settings" on localization_settings
  for select using (auth.role() = 'authenticated');
create policy "authenticated update localization_settings" on localization_settings
  for update using (auth.role() = 'authenticated');

create policy "authenticated update email_config" on email_config
  for update using (auth.role() = 'authenticated');

create policy "authenticated update email_subscriptions" on email_subscriptions
  for update using (auth.role() = 'authenticated');

create policy "authenticated update modules" on modules
  for update using (auth.role() = 'authenticated');

create policy "authenticated update password_policy" on password_policy
  for update using (auth.role() = 'authenticated');

create policy "authenticated insert custom_fields" on custom_fields
  for insert with check (auth.role() = 'authenticated');
create policy "authenticated delete custom_fields" on custom_fields
  for delete using (auth.role() = 'authenticated');

create policy "authenticated insert tos_documents" on tos_documents
  for insert with check (auth.role() = 'authenticated');
create policy "authenticated update tos_documents" on tos_documents
  for update using (auth.role() = 'authenticated');

create policy "authenticated insert own tos_acceptances" on tos_acceptances
  for insert with check (user_id = auth.uid());
