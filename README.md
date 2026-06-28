# UPCBMA — Website

Next.js 15 + Supabase site for the Uttar Pradesh Corrugated Box Manufacturers Association.

**Live:** https://upcbma.com  
**Handbook:** see [PROJECT-HANDBOOK.md](./PROJECT-HANDBOOK.md) for full infrastructure, deployment, and onboarding details.

## Stack

- **Next.js 15** (App Router, Server Actions, TypeScript)
- **Tailwind CSS 4** with Modern Minimalist design tokens
- **Supabase** — Postgres + Auth + Storage + Row Level Security
- **Resend** — transactional email
- **Deployment** — Vercel (auto-deploy on push to `main`)

## Local setup

```bash
pnpm install          # or npm install / yarn
cp .env.local.example .env.local
# Fill in Supabase + Resend keys (see .env.local.example)
pnpm dev
```

Open http://localhost:3000.

## Project layout

```
app/
  page.tsx            Public home
  [slug]/             Chapter pages (kanpur, lucknow, …)
  login/              Auth
  me/                 Member dashboard
  admin/              Admin panel (guarded by middleware.ts)
lib/
  supabase/           Browser, server, and middleware clients
  auth.ts, tier.ts    Auth + 4-tier role system
  db-types.ts         TypeScript types matching the schema
components/
  ui/                 Primitives (Button, Input, Card, …)
  public/             StateShell, ChapterShell, nav, footer
  admin/              Sidebar, page header, chapter switcher
migrations/           SQL migrations (apply via Supabase SQL editor)
middleware.ts         Session refresh + /admin auth gate
```

## Auth flow

1. User goes to `/admin/*`.
2. `middleware.ts` checks the Supabase session cookie.
3. No session → redirect to `/login`.
4. Login uses `signInWithPassword` → members land on `/me`, admins on `/admin`.
5. RLS policies on every table ensure users only access what their role allows.

## Design tokens

Defined in `app/globals.css` under `@theme`. To re-theme the whole site, change those values.
