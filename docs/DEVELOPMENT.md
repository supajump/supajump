# WorkClear — Development Guide

Local setup, environment configuration, and day-to-day development workflows.

**Repository:** https://github.com/sagittaris/workclear — see [`REPOSITORY.md`](REPOSITORY.md) for remotes, PR workflow, and Vercel.

---

## Git remotes

```bash
git remote -v
# origin    https://github.com/sagittaris/workclear.git (fetch/push)
# upstream  https://github.com/supajump/supajump.git (optional)
```

```bash
git remote set-url origin https://github.com/sagittaris/workclear.git
```

Open pull requests on **`sagittaris/workclear`**, not the upstream `supajump` org repo.

---

## Prerequisites

- Node.js 20+
- [pnpm](https://pnpm.io) 9+
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- [Docker](https://www.docker.com/) (for local Supabase)
- Stripe account (test mode) — required from Sprint 11 (billing)
- Resend or AWS SES account — required from Sprint 8 (reminders)

---

## Quick Start

```bash
# From repository root
pnpm install
supabase start
pnpm dev --filter @supajump/app
```

Open [http://localhost:3000](http://localhost:3000).

Get local Supabase credentials:

```bash
supabase status
```

Copy the API URL and anon key into `apps/app/.env.local`.

---

## Environment Variables

File: `apps/app/.env.local` (never commit)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `SERVICE_ROLE` | Yes | Supabase service role key (server-only) |
| `EMAIL_PROVIDER` | Yes | `resend` or `ses` |
| `EMAIL_API_KEY` | Yes | Resend API key or SES credential |
| `APP_URL` | Yes (VR-001) | Base URL for upload links, e.g. `http://localhost:3000` |
| `STRIPE_SECRET_KEY` | S11+ | Stripe secret key (test mode for dev) |
| `STRIPE_WEBHOOK_SECRET` | S11+ | Stripe webhook signing secret |

Validated in `apps/app/env.mjs`. After VR-001, `APP_URL` and Stripe vars will be added to validation.

Example `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SERVICE_ROLE=your-service-role-key

APP_URL=http://localhost:3000

EMAIL_PROVIDER=resend
EMAIL_API_KEY=re_xxxxxxxx

STRIPE_SECRET_KEY=sk_test_xxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxx
```

---

## Monorepo Commands

Run from repository root:

```bash
pnpm dev                          # All apps
pnpm dev --filter @supajump/app   # Next.js app only
pnpm build                        # Build all packages
pnpm lint                         # ESLint (run before every commit)
pnpm db:gen:types                 # Regenerate Supabase TypeScript types
```

---

## Database Workflow

WorkClear uses declarative schemas in `supabase/schemas/`. Migrations are generated via diff.

```bash
# 1. Edit schema file(s) in supabase/schemas/
# 2. Stop local Supabase
supabase stop

# 3. Generate migration
supabase db diff --use-migra -f descriptive_migration_name

# 4. Restart and apply
supabase start
supabase migration up

# 5. Regenerate TypeScript types (REQUIRED after schema changes)
pnpm db:gen:types
```

**Rule:** Never skip `pnpm db:gen:types` after a schema PR. Commit the updated `apps/app/src/lib/database.types.ts`.

Reset local database (destructive):

```bash
supabase db reset
```

---

## Feature Development Pattern

WorkClear features live in `src/features/[feature-name]/`:

```
src/features/counterparties/
├── components/       # UI components
├── hooks/            # TanStack Query hooks
└── queries/          # Supabase query functions
```

Data access flow:

1. **Queries** — pure functions in `features/*/queries/` registered in `src/queries/index.ts`
2. **Query keys** — defined in `src/queries/keys.ts`
3. **Hooks** — wrap queries/mutations in `features/*/hooks/`
4. **Pages** — prefetch in Server Components, hydrate via `HydrationBoundary`
5. **Loading states** — skeleton components, not spinners

Reference implementation: `src/features/posts/`

---

## Code Conventions

| Rule | Detail |
|------|--------|
| Package manager | pnpm only |
| Semicolons | None |
| Quotes | Double quotes |
| Path aliases | `@/*` for src, `@features/*` for features |
| Imports | external → internal → relative |
| Client components | Only when interactivity is required |
| Permissions | Check via `has_org_permission` RPC in UI; enforce via RLS in DB |

---

## Public Routes

The vendor upload portal bypasses auth middleware:

```typescript
// src/middleware.ts — add /upload to public allow-list
const PUBLIC_ROUTES = ["/", "/auth/", "/upload"]
```

Upload API routes use the **service role** client — never expose `SERVICE_ROLE` to the client.

---

## Local Stripe Webhooks

For billing development (S11+), forward Stripe events to your local app:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copy the webhook signing secret from the CLI output into `STRIPE_WEBHOOK_SECRET`.

See [`BILLING-SETUP.md`](BILLING-SETUP.md) for product/price configuration.

---

## Edge Functions

Reminder processing runs as a Supabase Edge Function:

```bash
# Serve locally
supabase functions serve process-reminders

# Deploy
supabase functions deploy process-reminders
```

Cron jobs are configured in `supabase/config.toml` under `[db.cron]`.

---

## Super Admin Local Setup

Platform admin requires membership in an org with `type = 'super'`. For local testing, insert manually after signup:

```sql
-- Create super org (run once)
insert into organizations (name, slug, type)
values ('WorkClear Platform', 'workclear-platform', 'super')
on conflict do nothing;

-- Add your user as member (replace UUIDs)
insert into org_memberships (org_id, user_id)
select id, 'your-user-uuid' from organizations where type = 'super';
```

Then navigate to `/admin`.

---

## Linting & Build Checks

Before opening a PR:

```bash
pnpm lint
pnpm build
```

Turborepo caches lint results for unchanged packages.

---

## Branch Convention

```
feat/vr-{number}-{short-slug}
db/vr-{number}-{short-slug}
chore/vr-{number}-{short-slug}
fix/vr-{number}-{short-slug}
```

See [`IMPLEMENTATION-PLAN.md`](IMPLEMENTATION-PLAN.md) for the full PR list (VR-001 → VR-041).

---

## Related Documents

| Document | Purpose |
|----------|---------|
| [`IMPLEMENTATION-PLAN.md`](IMPLEMENTATION-PLAN.md) | What to build, in what order |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | System design reference |
| [`AGENT-WORKFLOW.md`](AGENT-WORKFLOW.md) | AI-assisted development workflow |
| [`BILLING-SETUP.md`](BILLING-SETUP.md) | Stripe Dashboard configuration |
| [`QA-CHECKLIST.md`](QA-CHECKLIST.md) | Manual QA before release |
