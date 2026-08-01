# vertexhrm — web

Next.js (App Router) + TypeScript + Tailwind, Supabase for auth/database.
This is the starting scaffold, not the finished suite — see "What's built"
below for exactly what's real vs. placeholder.

## Stack

| Layer | Choice |
|---|---|
| Frontend hosting | Vercel |
| Source control | GitHub |
| Database + Auth | Supabase (Postgres) |
| Future | Self-hosted on your own IIS server once ready |

Framework note: this scaffold uses Next.js Server Actions / Route Handlers
as the backend (no separate ASP.NET Core API) — that's what makes the
"Vercel + GitHub + Supabase" deployment path work with one deploy instead
of two. If you want to keep the ASP.NET Core 9 API from the earlier HRM
build instead, say so and the data-fetching layer in this scaffold gets
swapped for API calls — the UI code doesn't need to change either way.

## Brand tokens

Pulled directly from your uploaded logo files, not guessed:
- Gradient: `#2f3fd9` → `#7b3fd9` (from `vertexhrm-logo-primary.svg`)
- Wordmark ink: `#17172b`
- Display font: Poppins (medium/600) for headings and the logo type
- Body font: Inter — Poppins is a display face, dense admin tables read
  better in Inter than Poppins at 14px

All defined once in `tailwind.config.ts` under the `brand`, `ink`, and
`surface` color scales — nothing in the components hardcodes a hex value.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in your Supabase project URL + keys
npm run dev
```

### Supabase setup

1. Create a project at supabase.com.
2. Run the migrations in `supabase/migrations/` in order (SQL Editor, or
   `supabase db push` if you have the CLI linked).
3. Create your first user in Supabase Auth (Authentication > Users >
   Add user), then insert a matching row into `app_users` with the
   System Administrator role so you can log in and actually see the
   admin screens.
4. Copy `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and
   `SUPABASE_SERVICE_ROLE_KEY` from Project Settings > API into
   `.env.local`.

### Deploying

- **Vercel:** import the GitHub repo, add the three env vars above in
  Project Settings > Environment Variables, deploy. No build config
  needed beyond that.
- **Later, your own IIS server:** `npm run build` produces a standard
  Next.js production build (`.next/`); IIS needs `iisnode` or a reverse
  proxy to a Node process (`npm run start`) — different enough from
  Vercel's zero-config hosting that it's worth planning for explicitly
  when you get there rather than assuming it's a drop-in move.

## What's built

- App shell: sidebar nav, topbar, auth-gated layout
- Login page (Supabase email/password auth)
- **Users** (`/admin/users`) — full implementation of HRM Admin spec
  §1.1: search/filter, bulk enable/disable/delete, CSV export, add/edit
  modal with the change-password flow. Currently running on seed data in
  the component — every place a Supabase call belongs is marked with a
  `TODO(supabase)` comment.
- Supabase schema migration for the shared platform layer (`roles`,
  `role_permissions`, `departments`, `locations`, `employees`,
  `app_users`, `audit_log`, `inbox_items`) with baseline Row Level
  Security policies, plus a seed migration for the 11 standard roles.

## What's next (not built yet)

Everything else in the specs — Organization, Roles & Permissions UI,
Job Section, Leave, Documents, and the whole Admin Ops module. The nav
links to placeholder pages for a few of these so the shell doesn't
break; the rest aren't linked yet.

Suggested build order, since Users only gets you so far on its own:
1. Wire Users to real Supabase queries (replace the seed data + TODOs)
2. Roles & Permissions screen — writes to `role_permissions`, and is
   what the rest of the app checks against
3. Organization (departments/locations) — Users already references
   `employees`, which references these
4. Pick one more full module end-to-end (Leave is the most-requested
   one from the conversation so far) rather than spreading thin across
   several half-built ones
