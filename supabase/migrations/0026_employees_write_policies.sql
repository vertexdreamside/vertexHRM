-- Write policies for `employees` ahead of wiring PIM to real queries.
-- Migration 0018 added the SELECT policy (fixing the "unreadable"
-- bug); nothing has ever been able to write to this table from the
-- client until now.

create policy "authenticated insert employees" on employees
  for insert with check (auth.role() = 'authenticated');
create policy "authenticated update employees" on employees
  for update using (auth.role() = 'authenticated');
create policy "authenticated delete employees" on employees
  for delete using (auth.role() = 'authenticated');
