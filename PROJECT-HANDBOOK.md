# UPCBMA Website — Project Handbook

> **Last updated:** 28 June 2026  
> **Purpose:** Single reference for anyone onboarding to the UPCBMA website — what it is, how it is built, where it runs, and how to work on it.

---

## 1. What this project is

**UPCBMA** = Uttar Pradesh Corrugated Box Manufacturers' Association.

This is the official **state-level website** for the association. It serves:

- **Public visitors** — about the org, chapter directory, news, events, agendas, lab catalogue, contact, join form
- **Members** — profile, password change, agenda proposals, lab bookings
- **Chapter admins (Tier 3)** — content and chapter operations via `/admin`
- **State admins (Tier 2)** — secretariat-wide admin
- **Super admins (Tier 1)** — site settings, locks, audit, impersonation, chapter management

**Active chapters (6):** Kanpur, Lucknow, Agra, Meerut, Ghaziabad, Varanasi  
Each chapter has a slug route: `/kanpur`, `/lucknow`, etc.

---

## 2. Tech stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router, Server Actions) | 15.x |
| Language | TypeScript | 5.6 |
| UI | React | 19 |
| Styling | Tailwind CSS | 4 |
| Icons | Lucide React | — |
| Markdown | marked | — |
| Database / Auth / Storage | Supabase (Postgres + Auth + RLS + Storage) | — |
| Email | Resend (HTTP API) | — |
| Hosting | Vercel | — |
| Font | Inter (Google Fonts via `next/font`) | — |
| Package manager | npm / pnpm / yarn (any works) | — |

**Design system:** "Modern Minimalist" — tokens defined in `app/globals.css` under `@theme`. Brand accent colours: gold `#dca135`, green `#0d6b3e`.

---

## 3. Live deployment

| Item | Value |
|------|-------|
| **Production URL** | https://upcbma.com |
| **WWW redirect** | https://www.upcbma.com → https://upcbma.com |
| **Hosting** | Vercel (`server: Vercel` in response headers) |
| **Deploy trigger** | Auto-deploy on push to `main` branch on GitHub |
| **Local dev** | `pnpm dev` → http://localhost:3000 |

There is **no `vercel.json`** — Vercel uses Next.js defaults. The Vercel project is linked to the GitHub repo (exact Vercel project name/team is in the Vercel dashboard under the account that owns `upcbma.com`).

---

## 4. Source code (GitHub)

| Item | Value |
|------|-------|
| **Repository** | https://github.com/Ujdasingh/UPCBMA-KANPUR |
| **Owner** | Ujdasingh |
| **Visibility** | Public |
| **Default branch** | `main` |
| **Description** | UPCBMA KANPUR OFFICIAL WEBSITE |
| **Last push (GitHub)** | 28 May 2026 |

> **Note:** There is no repo named "UPCVMA". The correct repo is **UPCBMA-KANPUR**.

### Local copy vs GitHub

The folder `UPCBMA WEBSITE/` on this machine is a git clone of the above repo. As of 28 Jun 2026 it is **in sync with `origin/main`**.

**Uncommitted local changes:**
- Modified: `package.json` (adds `db:apply-permissions-rls` script)
- Untracked: `scripts/apply-permissions-rls.mjs`, `migrations/2026_05_28_permissions_rls.sql`
- Untracked: `upcbma-push/` — a **nested duplicate clone** of the same repo (1 commit behind root; safe to ignore or delete)

---

## 5. Supabase (backend)

| Item | Value |
|------|-------|
| **Project ID / ref** | `edkeagxgdpyzhrhkwcqs` |
| **Project URL** | https://edkeagxgdpyzhrhkwcqs.supabase.co |
| **Dashboard** | https://supabase.com/dashboard/project/edkeagxgdpyzhrhkwcqs |
| **API keys** | https://supabase.com/dashboard/project/edkeagxgdpyzhrhkwcqs/settings/api |
| **SQL editor** | https://supabase.com/dashboard/project/edkeagxgdpyzhrhkwcqs/sql/new |
| **Storage** | Public bucket: `media` |

### What Supabase provides

- **Postgres database** — all content (members, chapters, news, events, agendas, bookings, etc.)
- **Auth** — email/password login; `@upcbma.com` member emails
- **Row Level Security (RLS)** — per-table policies; anon key is safe in browser
- **Storage** — images uploaded via admin (news, events, chapters, agendas)

### Storage URL pattern

```
https://edkeagxgdpyzhrhkwcqs.supabase.co/storage/v1/object/public/media/{folder}/{filename}
```

Folders: `news`, `events`, `agendas`, `chapters`, `misc`

### Database migrations

SQL files live in `migrations/`. Apply manually via Supabase SQL editor (no automated CI migration runner):

| File | Purpose |
|------|---------|
| `2026_05_03_agenda_engagement.sql` | Agenda votes + comments |
| `2026_05_03_booking_time_slot.sql` | Lab booking time slots |
| `2026_05_03_lab_catalogue_state_wide.sql` | State-wide lab catalogue |
| `2026_05_03_past_committee_terms.sql` | Past committee history |
| `2026_05_03_permissions_infra.sql` | Permissions table + infra |
| `2026_05_03_seed_installation_content.sql` | Initial seed content |
| `2026_05_03_vote_weighting.sql` | Agenda vote weights |
| `2026_05_04_chapter_admin_tiers.sql` | Chapter admin tier system |
| `2026_05_04b_chapter_admin_tiers_patch.sql` | Tier patch |
| `2026_05_05_audit_chapter_scope.sql` | Audit log chapter scoping |
| `2026_05_28_permissions_rls.sql` | RLS on permissions table *(local only, not yet on GitHub)* |

Types are hand-written in `lib/db-types.ts`. Regenerate with `supabase gen types typescript` when schema changes.

---

## 6. Environment variables

Copy `.env.local.example` → `.env.local` for local dev. **Never commit `.env.local`.**

### Required (Supabase)

```env
NEXT_PUBLIC_SUPABASE_URL=https://edkeagxgdpyzhrhkwcqs.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from Supabase dashboard>
SUPABASE_SERVICE_ROLE_KEY=<from Supabase dashboard — server only>
```

### Required for email (production)

```env
RESEND_API_KEY=<from resend.com dashboard>
EMAIL_FROM=UPCBMA <noreply@upcbma.com>
EMAIL_REPLY_TO=<optional>
```

### Optional

```env
NEXT_PUBLIC_SITE_URL=https://upcbma.com   # used in notification email links
SUPABASE_ACCESS_TOKEN=<personal token>    # only for scripts/apply-permissions-rls.mjs
```

> **Gap:** `RESEND_*` and `NEXT_PUBLIC_SITE_URL` are used in code but **not listed in `.env.local.example`**. Add them when setting up a new environment.

These same variables must be configured in **Vercel → Project → Settings → Environment Variables** for production.

---

## 7. Email (Resend)

| Item | Value |
|------|-------|
| **Provider** | [Resend](https://resend.com) |
| **API endpoint** | `https://api.resend.com/emails` |
| **Default sender** | `UPCBMA <noreply@upcbma.com>` |
| **Member login domain** | `@upcbma.com` (auto-generated on invite) |
| **Admin placeholders** | `admin@upcbma.com`, `admin.{chapter}@upcbma.com` |

### Notification triggers

| Tag | When |
|-----|------|
| `membership_request` | Someone submits `/join` |
| `member_invite` / `member_invite_resend` | Admin invites a member |
| `booking_confirmation` / `booking_notification` | Lab booking |
| `contact_state` | State contact form |
| `agenda_proposed` | Agenda proposal |
| `agenda_comment_notification` | Agenda comment |
| `raise_problem` | Chapter raise-problem form |

If `RESEND_API_KEY` is missing, emails are logged to stdout (dry-run) — no crash.

### Known config mismatch

- Admin UI saves `state_office_email` (shown on `/contact`)
- Email routing helper `secretariat()` reads `state_contact_email` (not in admin UI)

These are **different keys** — contact-form emails may not reach the intended inbox unless `state_contact_email` is set directly in the DB.

---

## 8. Domains & DNS

| Domain | Role |
|--------|------|
| **upcbma.com** | Primary production domain (Vercel) |
| **www.upcbma.com** | Redirects to apex |
| **@upcbma.com** | Member login emails; Resend sender domain |
| **upcbmakanpur.in** | Placeholder only in admin office-info form — not wired to production |

Domain registrar and DNS records are managed outside this repo (likely at the domain registrar + Vercel DNS). Check Vercel → Domains for current DNS configuration.

---

## 9. Subscriptions & third-party accounts

| Service | Used for | Billing |
|---------|----------|---------|
| **Supabase** | Database, auth, storage | Free tier or paid — check Supabase dashboard |
| **Vercel** | Hosting, SSL, CDN | Free tier or Pro — check Vercel dashboard |
| **Resend** | Transactional email | Free tier or paid — check Resend dashboard |
| **GitHub** | Source control | Free (public repo) |
| **Google Fonts** | Inter font | Free (loaded via Next.js) |

**No payment processing** (Stripe, Razorpay, etc.) is integrated. "Membership" is association membership managed in the admin, not online payments.

---

## 10. Project structure

```
app/
  page.tsx                 Home
  about/                   About + FCBM affiliation
  chapters/                Chapter directory
  [slug]/                  Dynamic chapter pages (kanpur, lucknow, …)
  news/, events/, agendas/ Public content (state-wide + ?chapter= filter)
  lab/, lab/book/          Lab catalogue + booking (login required to book)
  join/                    Membership application
  contact/                 State secretariat contact
  login/                   Standalone sign-in
  me/                      Member dashboard, profile, change password
  admin/                   Admin panel (38 pages)
  terms/, privacy-policy/, disclaimer/   Legal pages
components/
  public/                  Nav, footer, shells, mobile tab bar, avatar menu
  admin/                   Sidebar, page header, image upload, chapter switcher
  ui/                      Button, Input, Card, Table, Dialog, Badge
lib/
  supabase/                Browser, server, middleware clients
  auth.ts                  Admin context, member auth, impersonation
  tier.ts                  4-tier role resolution
  permissions.ts           Permission checks
  email.ts, notify.ts      Resend + recipient resolution
  site-settings.ts         DB-backed site config
  chapters.ts, chapter-loader.ts
  db-types.ts              Hand-written schema types
migrations/                SQL migration files
middleware.ts              Session refresh + /admin gate
public/                    Static assets (upcbma-logo.svg)
scripts/                   DB utility scripts
```

---

## 11. Routes map

### Public

| Route | Description |
|-------|-------------|
| `/` | Homepage |
| `/about` | About UPCBMA + FCBM |
| `/chapters` | All chapters |
| `/{slug}` | Chapter one-pager (e.g. `/kanpur`) |
| `/news`, `/news/[id]` | News (filter: `?chapter=kanpur`) |
| `/events` | Events calendar |
| `/agendas`, `/agendas/[slug]` | Live agendas + detail |
| `/agendas/propose` | Propose agenda (login required) |
| `/lab`, `/lab/book` | Lab tests + booking (book requires login) |
| `/join` | Apply for membership |
| `/contact` | Contact secretariat |
| `/login` | Sign in |
| `/me`, `/me/profile`, `/me/change-password` | Member area |
| `/terms`, `/privacy-policy`, `/disclaimer` | Legal |
| `/coming-soon` | Stub page (unlinked) |
| `/committee` | Redirects → `/chapters` |

Legacy chapter URLs (`/{slug}/news`, etc.) redirect to state routes or `#anchors`.

### Admin (`/admin/*` — session required)

Dashboard, Members, Committee, Past committees, Agendas, Lab tests, Bookings, News, Events, Messages, Join requests, Office info, Permissions, Audit log.

**Super-admin only:** Chapters, Super tools (site settings, locks, impersonate, audit, admin scopes).

---

## 12. Auth & roles

### Flow

1. User visits `/admin/*` → middleware checks Supabase session cookie
2. No session → redirect to `/login?next=/admin/...`
3. Login → `signInWithPassword` → HttpOnly cookies
4. Pages call `getAdminContext()` for role + chapter scope (RLS enforces at DB level)

### Tier system (`lib/tier.ts`)

| Tier | Who | Admin access |
|------|-----|--------------|
| 1 | `super_admin` role | Full + super tools |
| 2 | State-wide `admin_scopes` or legacy `admin` role | State secretariat admin |
| 3 | Chapter-scoped `admin_scopes` (officer or content) | Chapter admin |
| 4 | Regular member | `/me` only |

Member routes (`/me/*`, `/lab/book`, `/agendas/propose`) use page-level `getAuthedMember()` checks, not middleware.

---

## 13. Site settings (DB: `site_settings`)

| Key | Used for |
|-----|----------|
| `state_tagline` | Homepage tagline |
| `state_logo_url` | Org logo |
| `home_hero_url` | Homepage hero image |
| `state_office_email` | Shown on `/contact` |
| `state_office_phone` | Shown on `/contact` |
| `state_office_address` | Shown on `/contact` |
| `state_contact_email` | Email routing for `secretariat()` — **not in admin UI** |

Editable at `/admin/super/site-settings` (super admin).

---

## 14. Local development

```bash
cd "UPCBMA WEBSITE"
pnpm install          # or npm install
cp .env.local.example .env.local
# Fill Supabase keys (+ Resend for email testing)
pnpm dev              # http://localhost:3000
pnpm build            # production build (needs env vars)
pnpm typecheck        # TypeScript check
pnpm lint             # ESLint
```

**Build note:** `next.config.ts` currently **ignores TypeScript and ESLint errors** during `next build`. Fix types and re-enable when ready.

---

## 15. Known issues (audit — 28 Jun 2026)

All items from the initial audit were addressed on 28 Jun 2026:

- FCBM logo added to `public/fcbm-logo.png`
- Mobile footer padding fixed (footer clears tab bar)
- Login redirect: members → `/me`, admins → `/admin`; middleware sends signed-in `/login` → `/me`
- Tier-3 admin shortcut on `/me` uses `resolveTier().hasAdminAccess`
- Permissions sidebar hidden for chapter admins (Tier 3)
- Email routing: `secretariat()` reads `state_office_email` first
- Invalid Tailwind `py-13`/`py-15` replaced; micro-fonts bumped to 11px minimum
- Chapter nav active states fixed for anchors and query strings
- Chapter mobile header height reduced
- Legacy `PublicShell`/`nav`/`footer` removed; `/admin/profile` redirects to `/me/profile`
- `.bak` files removed; README and `.env.local.example` updated
- `RESERVED_SLUGS` expanded

**Remaining tech debt (non-blocking):**

- `lib/db-types.ts` may drift from live schema — regenerate with `supabase gen types typescript`
- `next.config.ts` still ignores TypeScript/ESLint at build time
- Nested `upcbma-push/` duplicate clone can be deleted locally

---

## 16. Making changes to production

To deploy code changes:

1. Edit code locally (or in Cursor)
2. Commit and push to `main` on https://github.com/Ujdasingh/UPCBMA-KANPUR
3. Vercel auto-builds and deploys to https://upcbma.com

To change database:

1. Write SQL in `migrations/` (naming: `YYYY_MM_DD_description.sql`)
2. Run in Supabase SQL editor: https://supabase.com/dashboard/project/edkeagxgdpyzhrhkwcqs/sql/new
3. Update `lib/db-types.ts` if schema changed

To change env vars / secrets:

- **Vercel:** Project → Settings → Environment Variables
- **Supabase keys:** Supabase dashboard → Settings → API
- **Resend:** resend.com dashboard → API Keys + Domains

### Access needed for full online management

| System | What you need |
|--------|---------------|
| GitHub | Push access to `Ujdasingh/UPCBMA-KANPUR` |
| Vercel | Team/project member for the `upcbma.com` deployment |
| Supabase | Project member on `edkeagxgdpyzhrhkwcqs` |
| Resend | API key + verified `upcbma.com` sending domain |
| Domain registrar | DNS for `upcbma.com` (if changing domains) |

---

## 17. Contacts & ownership

| Role | Detail |
|------|--------|
| GitHub owner | Ujdasingh |
| Repo | UPCBMA-KANPUR |
| Organisation | UPCBMA (Uttar Pradesh Corrugated Box Manufacturers' Association) |
| Affiliation | FCBM — Federation of Corrugated Box Manufacturers of India (https://www.fcbm.org) |

---

## 18. Quick links

| Resource | URL |
|----------|-----|
| Live site | https://upcbma.com |
| GitHub repo | https://github.com/Ujdasingh/UPCBMA-KANPUR |
| Supabase dashboard | https://supabase.com/dashboard/project/edkeagxgdpyzhrhkwcqs |
| Supabase API keys | https://supabase.com/dashboard/project/edkeagxgdpyzhrhkwcqs/settings/api |
| Supabase SQL editor | https://supabase.com/dashboard/project/edkeagxgdpyzhrhkwcqs/sql/new |
| Resend | https://resend.com |
| Vercel | https://vercel.com/dashboard |
| FCBM | https://www.fcbm.org |

---

*This handbook was generated from a full codebase audit on 28 June 2026. Update it when infrastructure, domains, or major architecture changes.*
