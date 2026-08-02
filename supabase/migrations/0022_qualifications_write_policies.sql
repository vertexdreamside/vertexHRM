-- Write policies for Qualifications (HRM Admin spec §3) ahead of wiring
-- it to real queries. qualification_items only had a SELECT policy.

create policy "authenticated insert qualification_items" on qualification_items
  for insert with check (auth.role() = 'authenticated');
create policy "authenticated update qualification_items" on qualification_items
  for update using (auth.role() = 'authenticated');
create policy "authenticated delete qualification_items" on qualification_items
  for delete using (auth.role() = 'authenticated');
