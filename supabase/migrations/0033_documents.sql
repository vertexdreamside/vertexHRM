-- Documents module (Admin Ops spec §2) — the module that four other
-- gaps have been waiting on: Job Title spec files (Job Section §1.3.1),
-- Candidate resumes (Recruitment), and any future document attachment
-- across the platform. Private Storage bucket + versioned table.

create table document_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);
insert into document_categories (name) values
  ('Policies'), ('Contracts'), ('Meeting Minutes'), ('Templates'),
  ('Job Specifications'), ('Recruitment'), ('General');

create table documents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category_id uuid references document_categories(id),
  owner_id uuid references app_users(id),
  storage_path text not null,
  version int not null default 1,
  expiry_date date,
  visibility text not null default 'Everyone' check (visibility in ('Everyone', 'Department', 'Specific Roles', 'Specific People')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index documents_category_idx on documents(category_id);
create index documents_expiry_idx on documents(expiry_date) where expiry_date is not null;

-- Version history — each re-upload adds a row here rather than
-- overwriting the file in Storage, per the original spec ("each
-- re-upload creates a new version rather than overwriting").
create table document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  storage_path text not null,
  version_number int not null,
  uploaded_by uuid references app_users(id),
  uploaded_at timestamptz not null default now()
);

alter table document_categories enable row level security;
alter table documents enable row level security;
alter table document_versions enable row level security;

create policy "authenticated read document_categories" on document_categories for select using (auth.role() = 'authenticated');
create policy "authenticated insert document_categories" on document_categories for insert with check (auth.role() = 'authenticated');

create policy "authenticated read documents" on documents for select using (auth.role() = 'authenticated');
create policy "authenticated insert documents" on documents for insert with check (auth.role() = 'authenticated');
create policy "authenticated update documents" on documents for update using (auth.role() = 'authenticated');
create policy "authenticated delete documents" on documents for delete using (auth.role() = 'authenticated');

create policy "authenticated read document_versions" on document_versions for select using (auth.role() = 'authenticated');
create policy "authenticated insert document_versions" on document_versions for insert with check (auth.role() = 'authenticated');

-- Private bucket — internal company documents, not public assets like
-- branding. Same reasoning as the "recruitment" bucket (migration 0029).
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

create policy "authenticated read documents bucket"
  on storage.objects for select
  using (bucket_id = 'documents' and auth.role() = 'authenticated');

create policy "authenticated upload documents bucket"
  on storage.objects for insert
  with check (bucket_id = 'documents' and auth.role() = 'authenticated');

-- job_titles.spec_document_id (migration 0005) and
-- candidates.resume_document_id (migration 0013) both existed as bare
-- uuid columns with no FK, since `documents` didn't exist yet. Wired
-- up properly now.
alter table job_titles
  add constraint job_titles_spec_document_id_fkey
  foreign key (spec_document_id) references documents(id);

alter table candidates
  add constraint candidates_resume_document_id_fkey
  foreign key (resume_document_id) references documents(id);
