-- Vertex HRM — Corporate Branding (HRM Admin spec §4).
-- Single-row table, same pattern as organization_profile (0004).

create table branding_settings (
  id boolean primary key default true check (id),
  primary_color text not null default '#27272a',
  primary_font_color text not null default '#18181b',
  primary_gradient_color_1 text not null default '#09090b',
  logo_url text,
  login_banner_url text,
  social_preview_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table branding_settings enable row level security;

create policy "authenticated read branding_settings" on branding_settings
  for select using (auth.role() = 'authenticated');

insert into branding_settings (id) values (true);

-- NOTE: for branding to apply platform-wide (not just the editing
-- admin's browser tab), app/layout.tsx needs to fetch this row
-- server-side and inject the three color values as inline CSS custom
-- properties before first paint. Not wired yet — see the TODO in
-- app/(dashboard)/admin/branding/page.tsx.
