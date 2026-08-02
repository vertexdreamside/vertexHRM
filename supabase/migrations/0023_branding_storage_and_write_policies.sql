-- Corporate Branding (HRM Admin spec §4) — write policy, and Storage
-- for logo/banner uploads (the first module needing actual file
-- storage rather than just table rows).

-- Branding is non-sensitive UI theming, not employee/business data —
-- made public-readable (not just authenticated-readable) so the login
-- page itself (no session yet) can render the org's branding, and so
-- root layout can inject it before first paint for every visitor, not
-- just logged-in ones. This is a second, additive permissive policy;
-- it doesn't replace the authenticated-read one from migration 0007.
create policy "public read branding_settings" on branding_settings
  for select using (true);

create policy "authenticated update branding_settings" on branding_settings
  for update using (auth.role() = 'authenticated');

-- Storage bucket for logo/banner uploads. Public bucket — these are
-- the same class of "meant to be publicly visible" asset as the
-- branding row above.
insert into storage.buckets (id, name, public)
values ('branding', 'branding', true)
on conflict (id) do nothing;

create policy "public read branding bucket"
  on storage.objects for select
  using (bucket_id = 'branding');

create policy "authenticated upload branding bucket"
  on storage.objects for insert
  with check (bucket_id = 'branding' and auth.role() = 'authenticated');

create policy "authenticated update branding bucket"
  on storage.objects for update
  using (bucket_id = 'branding' and auth.role() = 'authenticated');
