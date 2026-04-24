# UPCBMA Kanpur — Website

Next.js 15 + Supabase site for the Uttar Pradesh Corrugated Box Manufacturers Association, Kanpur Chapter.

## Stack

- **Next.js 15** (App Router, Server Actions, TypeScript)
- **Tailwind CSS 4** with Modern Minimalist design tokens
- **Supabase** — Postgres + Auth + Storage + Row Level Security
- **Deployment** — Vercel (auto-deploy on push to `main`)

## Local setup

```bash
pnpm install          # or npm install / yarn
cp .env.local.example .env.local
# Fill in SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY from
# https://supabase.com/dashboard/project/edkeagxgdpyzhrhkwcqs/settings/api
pnpm dev
```

Open http://localhost:3000.

## Project layout

```
app/
  layout.tsx          Root HTML + Inter font
  globals.css         Tailwind + Modern Minimalist tokens
  page.tsx            Public home (stub)
  login/              Auth
  admin/              Admin section (guarded by middleware.ts)
lib/
  supabase/           Browser, server, and middleware clients
  db-types.ts         TypeScript types matching the schema
components/
  ui/                 Primitives (Button, Input, Card, Table, Dialog, ...)
  admin/              Admin-only UI (sidebar, page header, ...)
middleware.ts         Redirects unauthenticated users from /admin to /login
```

## Auth flow

1. User goes to `/admin/*`.
2. `middleware.ts` checks the Supabase session cookie.
3. No session → redirect to `/login`.
4. Login uses `signInWithPassword` → sets HttpOnly cookies → redirects back to admin.
5. RLS policies on every table ensure the user can only read/write what their role allows.

## Design tokens

Defined in `app/globals.css` under `@theme`. To re-theme the whole site, change those values.
