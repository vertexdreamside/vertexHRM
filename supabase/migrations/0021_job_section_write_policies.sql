-- Write policies for Job Section (HRM Admin spec §1.3) ahead of wiring
-- it to real queries. All six tables in migration 0005 only ever had
-- SELECT policies.

create policy "authenticated insert currencies" on currencies for insert with check (auth.role() = 'authenticated');
create policy "authenticated update currencies" on currencies for update using (auth.role() = 'authenticated');

create policy "authenticated insert job_titles" on job_titles for insert with check (auth.role() = 'authenticated');
create policy "authenticated update job_titles" on job_titles for update using (auth.role() = 'authenticated');
create policy "authenticated delete job_titles" on job_titles for delete using (auth.role() = 'authenticated');

create policy "authenticated insert pay_grades" on pay_grades for insert with check (auth.role() = 'authenticated');
create policy "authenticated update pay_grades" on pay_grades for update using (auth.role() = 'authenticated');

create policy "authenticated insert employment_statuses" on employment_statuses for insert with check (auth.role() = 'authenticated');
create policy "authenticated update employment_statuses" on employment_statuses for update using (auth.role() = 'authenticated');

create policy "authenticated insert job_categories" on job_categories for insert with check (auth.role() = 'authenticated');
create policy "authenticated delete job_categories" on job_categories for delete using (auth.role() = 'authenticated');

create policy "authenticated insert work_shifts" on work_shifts for insert with check (auth.role() = 'authenticated');
