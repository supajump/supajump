# WorkClear

**Know a contractor is cleared before work starts.**

WorkClear is a multi-tenant compliance operations SaaS for property operators. It is built on the [Supajump](https://supajump.dev) starter kit (Next.js 15 + Supabase) in a Turborepo monorepo.

This repository contains the WorkClear product layer — vendor registry, document compliance, dispatch approval, reminders, billing, and platform admin — extending Supajump's auth, RBAC, and Stripe infrastructure.

---

## Documentation

| Document | Description |
|----------|-------------|
| [`docs/PRODUCT.md`](docs/PRODUCT.md) | Product scope, personas, user journeys |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Technical architecture |
| [`docs/IMPLEMENTATION-PLAN.md`](docs/IMPLEMENTATION-PLAN.md) | Sprint/PR plan (VR-001 → VR-041) |
| [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) | Local setup and dev workflow |
| [`docs/DOMAIN-GLOSSARY.md`](docs/DOMAIN-GLOSSARY.md) | Term definitions |
| [`docs/RBAC.md`](docs/RBAC.md) | Permissions reference |
| [`docs/DECISIONS.md`](docs/DECISIONS.md) | Architecture decision log |
| [`docs/BILLING-SETUP.md`](docs/BILLING-SETUP.md) | Stripe configuration guide |
| [`docs/AGENT-WORKFLOW.md`](docs/AGENT-WORKFLOW.md) | AI-assisted development guide |
| [`docs/QA-CHECKLIST.md`](docs/QA-CHECKLIST.md) | Pre-release manual QA |

---

## Quick Start

See [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) for full setup.

```bash
pnpm install
supabase start
pnpm dev --filter @supajump/app
```

Copy Supabase credentials from `supabase status` into `apps/app/.env.local`.

---

## Project Structure

```
.
├── apps/
│   └── app/                    # Next.js application (WorkClear UI)
├── packages/
│   └── create-supajump-app/    # Supajump CLI (upstream)
├── supabase/                   # Database schemas and migrations
├── docs/                       # WorkClear documentation
├── turbo.json
└── pnpm-workspace.yaml
```

---

## Monorepo Commands

```bash
pnpm dev                          # Start all apps
pnpm dev --filter @supajump/app   # Next.js app only
pnpm build                        # Build all packages
pnpm lint                         # ESLint (run before commits)
pnpm db:gen:types                 # Regenerate Supabase TypeScript types
```

---

## Foundation (Supajump)

WorkClear inherits from Supajump:

- Multi-tenant org model with dynamic RBAC
- Supabase Auth + SSR middleware
- Stripe billing tables and webhook handler
- TanStack Query data layer with server prefetching
- shadcn/ui component library

See [`docs/ARCHITECTURE.md` §2](docs/ARCHITECTURE.md#2-foundation-supajump-shell) for the full reuse inventory.

---

## Implementation Status

WorkClear is in **pre-implementation** (planning complete). Follow [`docs/IMPLEMENTATION-PLAN.md`](docs/IMPLEMENTATION-PLAN.md) starting with VR-001 (env setup) and VR-002 (rebrand).

Release target: **`v0.1.0`** after VR-041 (compliance MVP + billing + platform admin).
