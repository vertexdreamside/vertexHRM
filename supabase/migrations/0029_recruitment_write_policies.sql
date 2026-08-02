-- Write policies for Recruitment ahead of wiring it to real queries.
-- vacancies/candidates only had SELECT policies from migration 0013.

create policy "authenticated insert vacancies" on vacancies
  for insert with check (auth.role() = 'authenticated');
create policy "authenticated update vacancies" on vacancies
  for update using (auth.role() = 'authenticated');

create policy "authenticated insert candidates" on candidates
  for insert with check (auth.role() = 'authenticated');
create policy "authenticated update candidates" on candidates
  for update using (auth.role() = 'authenticated');
create policy "authenticated delete candidates" on candidates
  for delete using (auth.role() = 'authenticated');

-- Resumes are candidate personal data, not branding — private bucket,
-- authenticated-only read (unlike the public "branding" bucket).
insert into storage.buckets (id, name, public)
values ('recruitment', 'recruitment', false)
on conflict (id) do nothing;

create policy "authenticated read recruitment bucket"
  on storage.objects for select
  using (bucket_id = 'recruitment' and auth.role() = 'authenticated');

create policy "authenticated upload recruitment bucket"
  on storage.objects for insert
  with check (bucket_id = 'recruitment' and auth.role() = 'authenticated');
