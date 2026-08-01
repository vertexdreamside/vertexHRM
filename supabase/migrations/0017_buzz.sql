-- Vertex HRM — Buzz module (internal social feed).

create table buzz_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references app_users(id),
  text text not null,
  image_document_id uuid,  -- references documents(id) once §2 Documents exists
  created_at timestamptz not null default now()
);

create table buzz_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references buzz_posts(id) on delete cascade,
  user_id uuid not null references app_users(id),
  unique (post_id, user_id)
);

create table buzz_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references buzz_posts(id) on delete cascade,
  author_id uuid not null references app_users(id),
  text text not null,
  created_at timestamptz not null default now()
);

alter table buzz_posts enable row level security;
alter table buzz_likes enable row level security;
alter table buzz_comments enable row level security;

create policy "authenticated read buzz_posts" on buzz_posts for select using (auth.role() = 'authenticated');
create policy "authenticated read buzz_likes" on buzz_likes for select using (auth.role() = 'authenticated');
create policy "authenticated read buzz_comments" on buzz_comments for select using (auth.role() = 'authenticated');
create policy "authenticated insert own buzz_posts" on buzz_posts
  for insert with check (author_id = auth.uid());
create policy "authenticated insert own buzz_likes" on buzz_likes
  for insert with check (user_id = auth.uid());
create policy "authenticated insert own buzz_comments" on buzz_comments
  for insert with check (author_id = auth.uid());

-- Upcoming Anniversaries (Dashboard/Buzz sidebar widget) is derived from
-- employees.date_joined (PIM, migration 0010) — no separate table needed,
-- just a query: where date_part('month', date_joined) = current month,
-- ordered by day. Not yet wired to a live query — still seed data in
-- the Buzz page.
