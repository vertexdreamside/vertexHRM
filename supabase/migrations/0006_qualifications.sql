-- Vertex HRM — Qualifications (HRM Admin spec §3).
-- One generic table for all six lists (Skills, Education, Certificates,
-- Languages, Memberships, Nationalities) instead of six near-identical
-- tables — see vertex-core-data-model.md's note on this. `list_type`
-- distinguishes which list a row belongs to.

create table qualification_items (
  id uuid primary key default gen_random_uuid(),
  list_type text not null check (
    list_type in ('skills', 'education', 'certificates', 'languages', 'memberships', 'nationalities')
  ),
  name text not null,
  description text,  -- only used by 'skills' in the current UI; harmless null elsewhere
  created_at timestamptz not null default now(),
  unique (list_type, name)
);

create index qualification_items_list_type_idx on qualification_items(list_type);

alter table qualification_items enable row level security;

create policy "authenticated read qualification_items" on qualification_items
  for select using (auth.role() = 'authenticated');

insert into qualification_items (list_type, name) values
  ('education', 'Secondary Certificate'),
  ('education', 'Diploma'),
  ('education', 'Bachelor''s Degree'),
  ('education', 'Master''s'),
  ('languages', 'English'),
  ('languages', 'French'),
  ('languages', 'Creole'),
  ('nationalities', 'Seychellois'),
  ('nationalities', 'Indian'),
  ('nationalities', 'Sri Lankan');
