-- Write policies for Claims ahead of wiring it to real queries.
-- Migration 0015 only allowed inserting a claim for yourself, and had
-- no approve/reject (update) or expense-line write policies at all.

create policy "authenticated insert claim_events" on claim_events
  for insert with check (auth.role() = 'authenticated');

create policy "authenticated insert claim_expense_types" on claim_expense_types
  for insert with check (auth.role() = 'authenticated');

create policy "authenticated update claims" on claims
  for update using (auth.role() = 'authenticated');

create policy "authenticated insert claim_expense_lines" on claim_expense_lines
  for insert with check (auth.role() = 'authenticated');
