# WorkClear — Platform Architecture

Version: v1.0 (MVP → Production-ready foundation)
Status: Approved for implementation

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Foundation: Supajump Shell](#2-foundation-supajump-shell)
3. [Multi-Tenant Model](#3-multi-tenant-model)
4. [RBAC Design](#4-rbac-design)
5. [Frontend Architecture](#5-frontend-architecture)
6. [Database Schema](#6-database-schema)
7. [Storage Architecture](#7-storage-architecture)
8. [Compliance Engine](#8-compliance-engine)
9. [Document Processing Pipeline](#9-document-processing-pipeline)
10. [Event Architecture](#10-event-architecture)
11. [Notification & Reminder System](#11-notification--reminder-system)
12. [Auth & Vendor Portal](#12-auth--vendor-portal)
13. [Background Jobs](#13-background-jobs)
14. [Billing & Subscriptions](#14-billing--subscriptions)
15. [Platform Admin Console](#15-platform-admin-console)
16. [API Design](#16-api-design)
17. [Security Model](#17-security-model)
18. [Observability](#18-observability)
19. [Deployment Pipeline](#19-deployment-pipeline)
20. [Scaling Plan](#20-scaling-plan)
21. [Implementation Order](#21-implementation-order)

---

## 1. System Overview

WorkClear is a **modular monolith** built on top of the Supajump multi-tenant SaaS framework. It does not start with microservices. Complexity is added only when scale demands it.

```
┌─────────────────────────────────────────────────────────┐
│                  Frontend (Next.js / Vercel)             │
│                                                         │
│   App UI         Vendor Portal       Admin              │
└───────────────────────┬─────────────────────────────────┘
                        │
               BFF (Server Actions +
                Route Handlers)
                        │
┌───────────────────────▼─────────────────────────────────┐
│                   Supabase Platform                     │
│  Auth  │  PostgreSQL  │  Storage  │  Edge Fns  │  Cron  │
└───────────────────────┬─────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────┐
│               Application Modules                       │
│                                                         │
│  Identity   Counterparty   Documents   Compliance       │
│  Engagement   Notifications   Audit   Billing   Admin     │
└───────────────────────┬─────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────┐
│               External Services                         │
│      Email (Resend/SES)   │   OCR (future)              │
│   Stripe (billing)        │   PM integrations (future)  │
└─────────────────────────────────────────────────────────┘
```

### Architecture Principles

| Principle | Rule |
|-----------|------|
| AP1 — Compute status, never cache truth | Compliance status is derived from documents + requirements at query time, not stored as a mutable field |
| AP2 — Event-first | Every meaningful action emits a domain event (`document_uploaded`, `engagement_created`, etc.) |
| AP3 — Append-only documents | Document rows are never overwritten; new versions are inserted |
| AP4 — Tenant isolation at the database layer | Every query is scoped by `org_id`; RLS enforces this without application-layer gates |
| AP5 — No migration required for customers | WorkClear sits on top of existing workflows; no PM software replacement needed |

---

## 2. Foundation: Supajump Shell

WorkClear builds **on top of** Supajump, not from scratch. The following infrastructure already exists and must not be reimplemented.

### What Supajump Already Provides

| Capability | Location | Notes |
|-----------|----------|-------|
| Multi-tenant org model | `supabase/schemas/multi_tenant_rbac.sql` | `organizations`, `teams`, `groups` |
| User auth (SSR + middleware) | `apps/app/src/lib/supabase/`, `src/middleware.ts` | Supabase Auth + cookie session |
| RBAC engine | `supajump.has_permission()`, `supajump.user_permissions_view` | Dynamic roles, permission catalog, cascade |
| Org/team memberships | `org_memberships`, `team_memberships` | M2M with role assignment |
| Role seeding on create | DB triggers `trg_seed_org_defaults`, `trg_seed_team_defaults` | Runs automatically |
| User invitations | `invitations` table + `src/app/api/invitations/create/route.ts` | Email-based invite flow |
| Billing (Stripe) | `billing_customers`, `billing_subscriptions`, `src/app/api/webhooks/stripe/` | Full Stripe webhook handler |
| Email service | `src/lib/email/service.ts` | Supports Resend and SES via `EMAIL_PROVIDER` env var |
| Onboarding flow | `src/features/profile/onboarding-form.tsx` | Creates org + team on first login |
| UI shell | `src/components/ui/`, `src/components/data-table/`, `app-sidebar.tsx` | shadcn/ui + Tailwind |
| TanStack Query data layer | `src/queries/index.ts`, `src/queries/keys.ts` | Prefetch in RSC + client hooks pattern |
| Plugin architecture | `docs/PLUGIN-ARCHITECTURE-DECISION.md` | Feature modules follow plugin conventions |

### Documentation Index

| Document | Purpose |
|----------|---------|
| [`PRODUCT.md`](PRODUCT.md) | Product scope and user journeys |
| [`IMPLEMENTATION-PLAN.md`](IMPLEMENTATION-PLAN.md) | Sprint/PR breakdown |
| [`DEVELOPMENT.md`](DEVELOPMENT.md) | Local setup guide |
| [`DOMAIN-GLOSSARY.md`](DOMAIN-GLOSSARY.md) | Term definitions |
| [`RBAC.md`](RBAC.md) | Permissions reference |
| [`DECISIONS.md`](DECISIONS.md) | Architecture decision log |
| [`BILLING-SETUP.md`](BILLING-SETUP.md) | Stripe configuration |
| [`AGENT-WORKFLOW.md`](AGENT-WORKFLOW.md) | AI development workflow |
| [`QA-CHECKLIST.md`](QA-CHECKLIST.md) | Pre-release QA |

### What WorkClear Must Build

- Domain tables: `counterparties`, `documents`, `engagements`, `requirement_profiles`, `reminders`, `upload_tokens`
- New RBAC permission catalog entries for all domain resources
- Feature modules under `src/features/` (counterparties, documents, engagements, compliance, reminders)
- Compliance status engine (DB function + trigger)
- Public vendor upload portal (`/upload` route, bypasses auth middleware)
- Supabase Edge Function for reminder processing
- Supabase Storage bucket configuration
- Extended email templates
- Tenant billing portal UI (Stripe Customer Portal integration)
- Plan limit enforcement (DB trigger + limits UI)
- Platform Super Admin console (`/admin`)

---

## 3. Multi-Tenant Model

### Tenant Hierarchy

```
WorkClear Platform
│
├── ABC Properties  (organizations row, type='organization')
│     ├── Sarah — OWNER
│     ├── Michael — MANAGER
│     ├── Counterparties (vendor registry — org-scoped)
│     ├── Documents
│     └── Engagements
│
└── Sunset PM  (another organizations row)
      └── Emma — OWNER
```

### Supajump Mapping

| WorkClear concept | Supajump table / field | Notes |
|---|---|---|
| Customer company (tenant) | `organizations` (`type = 'organization'`) | One org = one paying customer |
| Personal sandbox | `organizations` (`type = 'personal'`) | Created on signup; single-user orgs |
| Internal staff | `org_memberships` + RBAC roles | Sarah, Michael, Emma |
| Vendor / contractor | `counterparties` (new) | External party, not an org member |
| Vendor portal access | `upload_tokens` (new) | Expiring public link; no login required |
| Subscription | `billing_customers` + `billing_subscriptions` | Keyed by `org_id` |

### Key Invariant

All domain tables (`counterparties`, `documents`, `engagements`, `reminders`) are scoped to `org_id`. There is no `team_id` dimension for WorkClear data — the org is the tenant boundary.

### Tenant Provisioning Lifecycle

```
User signs up (Supabase Auth)
        ↓
profiles trigger fires → creates profile row
        ↓
/app → OnboardingForm (no orgs found)
        ↓
api.organizations.createWithTeam() RPC
        ↓
trg_seed_org_defaults fires → seeds owner role + permission catalog
        ↓
WorkClear onboarding step 2: select required document types
        ↓
seed default requirement_profile for org
        ↓
createOrRetrieveCustomer(org_id) → Stripe customer row in billing_customers
        ↓
optional: Stripe Checkout or trial subscription (via webhook sync)
        ↓
/app/[org_id] dashboard
```

---

## 4. RBAC Design

### Platform Roles (internal)

| Role | Access |
|------|--------|
| `SUPER_ADMIN` | Full platform access, org impersonation, feature flags |
| `SUPPORT` | Read-only org data, audit logs |

These are not tenant roles. They are implemented via the `organizations` table `type = 'super'`.

### Tenant Roles

WorkClear extends Supajump's existing org-scope role catalog. The following roles are seeded via `supajump.permission_catalog` on org creation:

| Role | Billing | Invite users | Manage counterparties | Upload docs | Dispatch approval | Delete data |
|------|---------|-------------|----------------------|-------------|------------------|-------------|
| `owner` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `admin` | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `manager` | ✗ | ✗ | ✓ | ✓ | ✓ | ✗ |
| `staff` | ✗ | ✗ | ✓ (view only) | ✓ | ✗ | ✗ |

The `vendor` role does **not** exist as an org member. Vendors access the system only via public upload tokens.

### Permission Catalog Extensions

New resources added to `supajump.permission_catalog` in `supabase/schemas/multi_tenant_rbac.sql`:

```sql
-- counterparties
('organization', 'owner',   'counterparties', 'view',   'all', true,  null),
('organization', 'owner',   'counterparties', 'create', 'all', true,  null),
('organization', 'owner',   'counterparties', 'edit',   'all', true,  null),
('organization', 'owner',   'counterparties', 'delete', 'all', true,  null),
('organization', 'admin',   'counterparties', 'view',   'all', false, null),
('organization', 'admin',   'counterparties', 'create', 'all', false, null),
('organization', 'admin',   'counterparties', 'edit',   'all', false, null),
('organization', 'admin',   'counterparties', 'delete', 'all', false, null),
('organization', 'manager', 'counterparties', 'view',   'all', false, null),
('organization', 'manager', 'counterparties', 'create', 'all', false, null),
('organization', 'manager', 'counterparties', 'edit',   'all', false, null),
-- repeat pattern for: documents, engagements, requirement_profiles
```

### RLS Policy Template

All new domain tables use the existing `supajump.has_permission()` function. Because data is org-scoped (no `team_id`), `team_id` is passed as `NULL`:

```sql
create policy "rls_counterparties_select" on public.counterparties
for select to authenticated using (
  supajump.has_permission('counterparties', 'view', org_id, null, owner_id)
);
```

---

## 5. Frontend Architecture

### Stack

```
Next.js 15 (App Router)   TypeScript
React                      Tailwind CSS
shadcn/ui                  TanStack Query v5
React Hook Form            Zod
```

Deployment: **Vercel**

### Route Structure

```
/                           Landing page
/auth/login|sign-up|...     Auth flows (Supabase)
/upload                     Public vendor upload portal (no auth)

/app                        Org picker / onboarding
/app/[org_id]               Compliance dashboard (replaces team dashboard)
/app/[org_id]/counterparties           Vendor registry
/app/[org_id]/counterparties/[id]      Vendor detail (docs, timeline, requirements)
/app/[org_id]/engagements              Engagement list
/app/[org_id]/engagements/[id]         Dispatch approval card
/app/[org_id]/members                  (existing) Org members
/app/[org_id]/invitations              (existing) Invitations
/app/[org_id]/roles                    (existing) RBAC roles
/app/[org_id]/settings                 (existing) Org settings
/app/[org_id]/settings/billing        Billing portal UI (Stripe Customer Portal)
/app/[org_id]/settings/limits         Plan limits + usage
/app/[org_id]/settings/requirements    Requirement profiles
/admin                                  Platform ops console (SUPER_ADMIN only)
```

Note: The `[team_id]` dimension is not used for WorkClear domain routes. The existing `[org_id]/[team_id]` routing and layouts are preserved for the Supajump base features but WorkClear routes live at the `[org_id]` level.

### Feature Module Structure

Follows the plugin architecture conventions described in `docs/PLUGIN-ARCHITECTURE-DECISION.md` and the posts feature reference pattern:

```
src/features/
├── counterparties/
│   ├── components/
│   │   ├── counterparties-table.tsx
│   │   ├── counterparty-detail.tsx
│   │   ├── create-counterparty-modal.tsx
│   │   ├── invite-vendor-button.tsx
│   │   └── compliance-status-badge.tsx
│   ├── hooks/
│   │   └── use-counterparties.ts
│   └── queries/
│       └── counterparties.ts
│
├── documents/
│   ├── components/
│   │   ├── documents-table.tsx
│   │   ├── upload-document-modal.tsx
│   │   └── verify-document-button.tsx
│   ├── hooks/
│   │   └── use-documents.ts
│   └── queries/
│       └── documents.ts
│
├── engagements/
│   ├── components/
│   │   ├── engagements-table.tsx
│   │   ├── create-engagement-modal.tsx
│   │   └── dispatch-approval-card.tsx
│   ├── hooks/
│   │   └── use-engagements.ts
│   └── queries/
│       └── engagements.ts
│
├── compliance/
│   ├── components/
│   │   ├── compliance-stats.tsx        # READY / WARNING / BLOCKED / Jobs Today
│   │   └── expiring-soon-list.tsx
│   ├── hooks/
│   │   └── use-compliance-stats.ts
│   └── engine/
│       ├── rules.ts                    # ExpiryRule, MissingDocRule, etc.
│       └── evaluator.ts               # Compose rules → compute status
│
├── reminders/
│   ├── hooks/
│   │   └── use-reminders.ts
│   └── queries/
│       └── reminders.ts
│
├── requirements/
│   ├── components/
│   │   └── requirement-profile-form.tsx
│   ├── hooks/
│   │   └── use-requirement-profiles.ts
│   └── queries/
│       └── requirements.ts
│
├── billing/
│   ├── components/
│   │   ├── billing-status-card.tsx
│   │   ├── billing-portal-button.tsx
│   │   └── limits-usage-card.tsx
│   ├── hooks/
│   │   └── use-billing-status.ts
│   └── queries/
│       └── billing.ts
│
└── platform-admin/
    ├── components/
    │   ├── organizations-table.tsx
    │   └── organization-detail-card.tsx
    ├── hooks/
    │   └── use-platform-organizations.ts
    └── queries/
        └── platform-admin.ts
```

### Data Fetching Pattern

All data flows follow the established Supajump pattern (reference: `src/features/posts/`):

```typescript
// page.tsx (Server Component) — prefetch on server
const queryClient = getQueryClient()
await queryClient.prefetchQuery({
  // eslint-disable-next-line @tanstack/query/exhaustive-deps
  queryKey: counterpartiesKeys.list(orgId),
  queryFn: () => api.counterparties.getAll(supabase, orgId),
})
return (
  <HydrationBoundary state={dehydrate(queryClient)}>
    <CounterpartiesTable orgId={orgId} />
  </HydrationBoundary>
)

// use-counterparties.ts (Client hook)
export function useCounterparties(orgId: string) {
  const supabase = createClient()
  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: counterpartiesKeys.list(orgId),
    queryFn: () => api.counterparties.getAll(supabase, orgId),
  })
}
```

### Query Keys

Defined in `src/queries/keys.ts`:

```typescript
export const counterpartiesKeys = {
  all: () => ['counterparties'] as const,
  list: (orgId: string) => ['counterparties', orgId] as const,
  detail: (id: string) => ['counterparty', id] as const,
}
export const documentsKeys = {
  all: () => ['documents'] as const,
  byCounterparty: (counterpartyId: string) => ['documents', counterpartyId] as const,
}
export const engagementsKeys = {
  all: () => ['engagements'] as const,
  list: (orgId: string) => ['engagements', orgId] as const,
  detail: (id: string) => ['engagement', id] as const,
}
export const billingKeys = {
  status: (orgId: string) => ['billing', 'status', orgId] as const,
  limits: (orgId: string) => ['billing', 'limits', orgId] as const,
}
export const platformAdminKeys = {
  organizations: () => ['platform-admin', 'organizations'] as const,
  organization: (orgId: string) => ['platform-admin', 'organization', orgId] as const,
}
```

### Navigation

`src/lib/menu-list.tsx` is replaced with WorkClear nav groups:

```
Compliance
  ├── Dashboard          /app/[org_id]
  ├── Counterparties     /app/[org_id]/counterparties
  └── Engagements        /app/[org_id]/engagements

Organization
  ├── Members            /app/[org_id]/members
  ├── Invitations        /app/[org_id]/invitations
  └── Roles              /app/[org_id]/roles

Settings
  ├── Requirements       /app/[org_id]/settings/requirements
  ├── Billing            /app/[org_id]/settings/billing   (owner only)
  ├── Limits             /app/[org_id]/settings/limits    (owner only)
  └── General            /app/[org_id]/settings

Platform (SUPER_ADMIN only)
  └── Admin Console      /admin
      └── Organization   /admin/organizations/[org_id]
```

---

## 6. Database Schema

### Existing Tables (Supajump — do not modify structure)

| Table | Purpose |
|-------|---------|
| `organizations` | Tenant root. `type = 'organization'` = paying customer. |
| `teams` | Sub-workspace inside org. Not used for WorkClear domain data. |
| `org_memberships` | Staff users ↔ org M2M |
| `roles`, `role_permissions` | Dynamic RBAC |
| `org_member_roles` | Role assignments per org member |
| `profiles` | Auth user profile |
| `invitations` | Email-based org invitations |
| `billing_customers`, `billing_subscriptions`, `billing_products`, `billing_prices` | Stripe billing |

### New Domain Tables

Schema files live in `supabase/schemas/`. Migration files in `supabase/migrations/`.

#### `counterparties`

```sql
create table public.counterparties (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz default now(),
  updated_at    timestamptz,
  org_id        uuid not null references public.organizations(id) on delete cascade,
  owner_id      uuid references auth.users(id) on delete set null default auth.uid(),
  legal_name    text not null,
  roles         text[] default '{}',  -- ['vendor','contractor','subcontractor','supplier']
  contact_email text,
  notes         text
);

alter table public.counterparties enable row level security;

create index counterparties_org_id_idx     on public.counterparties (org_id);
create index counterparties_email_idx      on public.counterparties (contact_email);
create index counterparties_created_at_idx on public.counterparties (created_at desc);

create trigger set_counterparties_timestamp
  before insert or update on public.counterparties
  for each row execute function supajump.trigger_set_timestamps();
```

Compliance status is **computed**, not stored. The `counterparties` table has no `status` column. Status is derived by the compliance engine at query time (see Section 8).

#### `documents`

```sql
create table public.documents (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz default now(),
  counterparty_id     uuid not null references public.counterparties(id) on delete cascade,
  org_id              uuid not null references public.organizations(id) on delete cascade,
  owner_id            uuid references auth.users(id) on delete set null,
  document_type       text not null,         -- 'coi' | 'w9' | 'license' | 'other'
  storage_path        text,                  -- Supabase Storage path
  file_name           text,
  file_size_bytes     bigint,
  mime_type           text,
  expires_at          date,
  verified            boolean default false,
  verified_at         timestamptz,
  verified_by         uuid references auth.users(id),
  extracted_data      jsonb default '{}',    -- OCR / parsed metadata (future)
  source              text default 'upload', -- 'upload' | 'email' | 'api'
  metadata            jsonb default '{}'
);

alter table public.documents enable row level security;

create index documents_counterparty_id_idx on public.documents (counterparty_id);
create index documents_org_id_idx          on public.documents (org_id);
create index documents_expires_at_idx      on public.documents (expires_at);
create index documents_type_idx            on public.documents (document_type);
```

Documents are **append-only** (AP3). `UPDATE` is restricted to verification fields only. New document versions are always new rows.

#### `requirement_profiles`

```sql
create table public.requirement_profiles (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  org_id     uuid not null references public.organizations(id) on delete cascade,
  name       text not null,
  is_default boolean default false,
  rules_json jsonb default '[]'
  -- rules_json shape:
  -- [{ "document_type": "coi", "required": true, "warn_days_before_expiry": 30 }, ...]
);

alter table public.requirement_profiles enable row level security;

create index requirement_profiles_org_id_idx on public.requirement_profiles (org_id);
```

#### `engagements`

```sql
create table public.engagements (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz default now(),
  updated_at      timestamptz,
  org_id          uuid not null references public.organizations(id) on delete cascade,
  owner_id        uuid references auth.users(id) on delete set null default auth.uid(),
  counterparty_id uuid not null references public.counterparties(id),
  property_name   text,
  scheduled_date  date,
  engagement_type text,
  approval_status text default 'pending', -- 'pending' | 'approved' | 'blocked'
  approved_at     timestamptz,
  approved_by     uuid references auth.users(id),
  blocked_reason  text,
  notes           text
);

alter table public.engagements enable row level security;

create index engagements_org_id_idx          on public.engagements (org_id);
create index engagements_counterparty_id_idx on public.engagements (counterparty_id);
create index engagements_scheduled_date_idx  on public.engagements (scheduled_date);
create index engagements_status_idx          on public.engagements (approval_status);
```

#### `reminders`

```sql
create table public.reminders (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz default now(),
  org_id          uuid not null references public.organizations(id) on delete cascade,
  counterparty_id uuid references public.counterparties(id) on delete cascade,
  document_id     uuid references public.documents(id) on delete cascade,
  reminder_type   text not null, -- 'expiry_30' | 'expiry_14' | 'expiry_7' | 'missing_doc' | 'manual'
  send_at         timestamptz not null,
  sent_at         timestamptz,
  status          text default 'pending', -- 'pending' | 'sent' | 'failed'
  error_message   text
);

alter table public.reminders enable row level security;

create index reminders_org_id_idx      on public.reminders (org_id);
create index reminders_send_at_idx     on public.reminders (send_at);
create index reminders_status_idx      on public.reminders (status);
create index reminders_document_id_idx on public.reminders (document_id);
```

#### `upload_tokens`

```sql
create table public.upload_tokens (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz default now(),
  counterparty_id uuid not null references public.counterparties(id) on delete cascade,
  org_id          uuid not null references public.organizations(id) on delete cascade,
  token           text not null unique default encode(gen_random_bytes(32), 'hex'),
  expires_at      timestamptz not null,
  used_at         timestamptz,
  created_by      uuid references auth.users(id)
);

-- No RLS row policies. Accessed exclusively via service role in API route handler.
alter table public.upload_tokens enable row level security;
```

#### `compliance_snapshots` (cache only, optional)

```sql
create table public.compliance_snapshots (
  id               uuid primary key default gen_random_uuid(),
  counterparty_id  uuid not null references public.counterparties(id) on delete cascade,
  org_id           uuid not null,
  computed_status  text not null, -- 'ready' | 'warning' | 'blocked' | 'pending'
  snapshot_data    jsonb default '{}',
  computed_at      timestamptz default now()
);

create index compliance_snapshots_counterparty_idx on public.compliance_snapshots (counterparty_id);
create index compliance_snapshots_computed_at_idx  on public.compliance_snapshots (computed_at desc);
```

TTL: rows older than 24 hours are stale and must be recomputed. Managed by the nightly background job.

#### `audit_logs`

```sql
create table public.audit_logs (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  org_id     uuid not null,
  user_id    uuid references auth.users(id),
  entity     text not null,      -- 'counterparty' | 'document' | 'engagement'
  entity_id  uuid,
  event      text not null,      -- 'document_uploaded' | 'engagement_approved' etc.
  payload    jsonb default '{}',
  ip_address text
);

-- Append-only: no UPDATE, no DELETE policies
alter table public.audit_logs enable row level security;

create index audit_logs_org_id_idx     on public.audit_logs (org_id);
create index audit_logs_entity_id_idx  on public.audit_logs (entity_id);
create index audit_logs_created_at_idx on public.audit_logs (created_at desc);
```

#### Billing tables (existing — Supajump)

WorkClear reuses the Supajump billing schema in `supabase/schemas/billing.sql`. No new billing tables are required for MVP.

| Table | Purpose |
|-------|---------|
| `billing_customers` | Maps `org_id` → Stripe `customer_id` |
| `billing_products` | Stripe products synced via webhook |
| `billing_prices` | Stripe prices synced via webhook |
| `billing_subscriptions` | Active subscription per org |

Key RPC (already exists):

```sql
public.get_organization_billing_status(lookup_org_id uuid) → json
-- Returns: { id, status, billing_email, plan_name }
```

#### `limits.sql` (new — VR-040)

Plan limit enforcement lives in a dedicated schema file registered in `supabase/config.toml`:

```sql
-- supabase/schemas/limits.sql

create or replace function supajump.get_counterparty_limit_for_plan(plan_name text)
returns integer as $$
begin
  return case plan_name
    when 'Starter' then 50
    when 'Growth' then null   -- unlimited
    when 'Pro'     then null  -- unlimited
    else 50                   -- safe default when no billing data yet
  end;
end;
$$ language plpgsql immutable;

create or replace function supajump.enforce_counterparty_limit()
returns trigger as $$
declare
  billing json;
  plan_name text;
  limit_val integer;
  current_count integer;
begin
  billing := public.get_organization_billing_status(NEW.org_id);
  plan_name := billing->>'plan_name';
  limit_val := supajump.get_counterparty_limit_for_plan(plan_name);

  if limit_val is null then
    return NEW; -- unlimited plan
  end if;

  select count(*) into current_count
  from public.counterparties
  where org_id = NEW.org_id;

  if current_count >= limit_val then
    raise exception 'Counterparty limit reached for plan % (% max)', plan_name, limit_val;
  end if;

  return NEW;
end;
$$ language plpgsql;

create trigger trg_enforce_counterparty_limit
  before insert on public.counterparties
  for each row execute function supajump.enforce_counterparty_limit();
```

Enforcement is **server-side only** (DB trigger). The UI surfaces friendly errors when the trigger raises.

### Entity Relationship Overview

```
organizations (1)
  │
  ├── (1) billing_customers ──── Stripe customer
  ├── (n) billing_subscriptions ──── billing_prices ──── billing_products
  │
  ├── (n) counterparties
  │         │
  │         ├── (n) documents
  │         ├── (n) upload_tokens
  │         ├── (n) reminders
  │         └── (n) compliance_snapshots
  │
  ├── (n) engagements ──── (1) counterparties
  ├── (n) requirement_profiles
  └── (n) audit_logs
```

---

## 7. Storage Architecture

Provider: **Supabase Storage** (configured in `supabase/config.toml`)

### Buckets

| Bucket | Visibility | Purpose |
|--------|-----------|---------|
| `documents` | Private | COI, W9, license, and other compliance documents |
| `avatars` | Public | User profile photos (existing) |

### Path Convention

```
documents/{org_id}/{counterparty_id}/{document_id}/{filename}
```

Example:

```
documents/
  abc-org-uuid/
    vendor-42-uuid/
      doc-001-uuid/
        coi_acme_2026.pdf
```

This structure ensures:
- Easy org-level enumeration and deletion
- Signed URL generation scoped to a specific document
- No path collisions across tenants

### Access Pattern

**Staff (authenticated):** Supabase Storage RLS policy allows read/write for users who are members of the owning org. Policy checks `org_id` prefix against `supajump.get_organizations_for_current_user()`.

**Vendors (unauthenticated):** Upload via the public portal calls a Next.js API route (`/api/upload/[token]`) that:
1. Validates the token via service role
2. Generates a pre-signed upload URL (time-limited)
3. Returns the signed URL to the client for direct-to-Storage upload

**Download:** All document downloads return signed URLs with a 60-minute TTL. Never expose raw Storage paths to the client.

### File Validation

Before storage:
- MIME type whitelist: `application/pdf`, `image/jpeg`, `image/png`
- Maximum size: 10 MB per file (configurable per plan in `app_settings`)
- File name sanitised (no path traversal characters)

---

## 8. Compliance Engine

The compliance engine is a **pure function** — given a counterparty and its documents, it returns a status. It never writes. It is called on read, not on write.

### Status Values

| Status | Meaning |
|--------|---------|
| `pending` | No documents uploaded yet |
| `ready` | All required documents present, valid, and not near expiry |
| `warning` | At least one document expires within the warning threshold |
| `blocked` | At least one required document is missing or expired |

### Rules

Defined in `src/features/compliance/engine/rules.ts`:

```typescript
type Document = { document_type: string; expires_at: string | null; verified: boolean }
type Rule = { id: string; requirement: Requirement; evaluate: (docs: Document[]) => RuleResult }
type RuleResult = { status: 'ready' | 'warning' | 'blocked'; reason?: string }

// ExpiryRule: document exists but expires within warn_days_before_expiry
// MissingDocRule: required document_type not present or not verified
// ExpiredRule: document present but expires_at < today
```

### Evaluation Pipeline

```
counterparty_id
      ↓
fetch active documents (latest per document_type, verified = true)
      ↓
fetch org requirement_profile (is_default = true, or profile assigned to counterparty)
      ↓
for each rule in profile.rules_json:
  evaluate(documents) → RuleResult
      ↓
aggregate results:
  any 'blocked' → 'blocked'
  any 'warning' → 'warning'
  all 'ready'   → 'ready'
  no docs       → 'pending'
      ↓
return { status, failing_rules[], checked_at }
```

### Database Helper

```sql
create or replace function supajump.compute_compliance_status(
  _counterparty_id uuid,
  _org_id          uuid
) returns jsonb
language plpgsql stable security definer as $$
declare
  v_status text := 'pending';
  -- ... evaluates documents vs requirement_profile rules
begin
  -- Implementation reads documents and requirement_profiles,
  -- applies expiry and missing-doc rules, returns JSON result
  return jsonb_build_object(
    'status', v_status,
    'checked_at', now(),
    'failing_rules', '[]'::jsonb
  );
end;
$$;
```

This function is used by:
- The dashboard stats query (aggregate across all org counterparties)
- The dispatch approval card (single counterparty check)
- The `compliance_snapshots` cache refresh job

### Dispatch Decision

```
Create engagement
      ↓
supajump.compute_compliance_status(counterparty_id, org_id)
      ↓
status = 'ready' or 'warning' → show Approve button
status = 'blocked'            → show blocked reason, no Approve button
      ↓
Manager clicks Approve → engagement.approval_status = 'approved'
                       → audit_log event: engagement_approved
```

---

## 9. Document Processing Pipeline

### Stage 1 — Upload

```
Staff or Vendor uploads file
      ↓
Client → /api/upload/[token] (vendor) or direct Supabase Storage (staff)
      ↓
File lands in Storage: documents/{org_id}/{counterparty_id}/{doc_id}/filename
      ↓
API route inserts documents row (storage_path, document_type, expires_at, source)
      ↓
Event emitted: document_uploaded
```

### Stage 2 — Extraction (future)

```
document_uploaded event
      ↓
Edge Function: extract-document
      ↓
Call OCR service (Textract, Google Document AI, or Reducto)
      ↓
Parse: insured_name, policy_number, effective_date, expiry_date, coverage_amounts
      ↓
Update documents.extracted_data JSONB
      ↓
Event emitted: document_processed
```

For MVP, extraction is skipped. Staff manually enters `expires_at` and `document_type` on upload, and manually verifies.

### Stage 3 — Verification

```
Staff reviews document detail page
      ↓
Clicks "Verify" → verify-document-button.tsx
      ↓
Mutation: documents.verified = true, verified_by = current_user, verified_at = now()
      ↓
Compliance status recomputed for counterparty
      ↓
Event emitted: document_verified
```

### Stage 4 — Compliance Re-evaluation

On every `documents` insert or update, a DB trigger calls `supajump.compute_compliance_status()` and upserts `compliance_snapshots`. This keeps the dashboard cache fresh without a separate job.

### Stage 5 — Notification

Triggered by the reminder system (see Section 11).

---

## 10. Event Architecture

Event bus: **PostgreSQL NOTIFY + Supabase Edge Functions** (no external message queue for MVP).

### Domain Events

| Event | Trigger | Consumer |
|-------|---------|----------|
| `document_uploaded` | documents INSERT | Reminder scheduler, audit log |
| `document_verified` | documents UPDATE (verified=true) | Compliance snapshot refresh |
| `document_expiring` | Cron scan | Reminder insert |
| `engagement_created` | engagements INSERT | Compliance check, audit log |
| `engagement_approved` | engagements UPDATE (approval_status) | Audit log |
| `engagement_blocked` | Compliance check result | Notification to manager |
| `reminder_due` | Cron scan | Email dispatch |

### Event Flow Example: Document Upload

```
Upload completes
      ↓
documents row inserted (DB trigger fires)
      ↓
trigger: insert reminders for 30/14/7 days before expires_at
         insert audit_log row (event = 'document_uploaded')
         upsert compliance_snapshots
      ↓
Supabase Realtime notifies connected clients (dashboard refreshes)
```

---

## 11. Notification & Reminder System

Email provider: **Resend** (configured via `EMAIL_PROVIDER=resend` in `.env.local`). Falls back to SES. Both supported by the existing `src/lib/email/service.ts`.

### Email Templates

Located in `src/lib/email/templates/`:

```
upload-invite.ts         "You've been invited to upload compliance documents for [Org]"
reminder-expiry.ts       "Your COI for [Org] expires on [date] — please renew"
reminder-missing.ts      "A required document is missing for your profile with [Org]"
engagement-blocked.ts    "Dispatch blocked: [Vendor] is missing required documents"
```

Each template is a TypeScript function returning `{ subject, html }` — extending the existing `EmailOptions` interface.

### Reminder Lifecycle

```
Document inserted with expires_at
      ↓
DB trigger: insert reminders rows:
  { reminder_type: 'expiry_30', send_at: expires_at - 30 days }
  { reminder_type: 'expiry_14', send_at: expires_at - 14 days }
  { reminder_type: 'expiry_7',  send_at: expires_at - 7 days }
      ↓
Edge Function: process-reminders (runs hourly via Supabase Cron)
      ↓
query: SELECT * FROM reminders WHERE status='pending' AND send_at <= now()
      ↓
for each reminder:
  fetch counterparty.contact_email + org.name + document metadata
  sendEmail(template, data)
  UPDATE reminders SET status='sent', sent_at=now()
  on error: UPDATE reminders SET status='failed', error_message=...
```

### Edge Function: `process-reminders`

Located at `supabase/functions/process-reminders/index.ts`. Called via Supabase Cron on an hourly schedule. Uses service role key to bypass RLS.

```typescript
// supabase/functions/process-reminders/index.ts
Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  const { data: due } = await supabase
    .from('reminders')
    .select('*, counterparties(contact_email, legal_name), documents(document_type, expires_at)')
    .eq('status', 'pending')
    .lte('send_at', new Date().toISOString())

  for (const reminder of due) {
    // send email via Resend API directly (no Next.js layer)
    // update reminder status
  }
  return new Response('ok')
})
```

---

## 12. Auth & Vendor Portal

### Internal Staff Auth

Handled entirely by Supajump's existing Supabase Auth setup:
- `src/middleware.ts` — protects all `/app/*` routes, redirects to `/auth/login`
- `src/lib/supabase/client.ts` / `server.ts` — browser and server Supabase clients
- Auth flows: login, sign-up, forgot password, update password — all in `src/features/auth/`

### Vendor Upload Portal (No Login)

Vendors receive a public link; they do not create accounts. This is a deliberate product decision to minimise friction.

**Token Generation (staff action):**

```
Staff views counterparty detail
      ↓
Clicks "Send Upload Link"
      ↓
POST /api/upload-tokens
      ↓
Insert upload_tokens row (token = random 32-byte hex, expires_at = now() + 7 days)
      ↓
Return URL: https://app.workclear.io/upload?token={token}
      ↓
Staff copies / emails link to vendor
```

**Vendor Upload Flow:**

```
Vendor opens /upload?token={token}
      ↓
Middleware: /upload is in the allow-list (no auth required)
      ↓
Page calls GET /api/upload/validate?token={token} (service role, validates token)
      ↓
If valid: show upload form with counterparty name (legal_name from join)
If invalid/expired: show error screen
      ↓
Vendor selects document type, expiry date, uploads file
      ↓
POST /api/upload/{token}:
  validate token again (idempotency)
  upload file to Storage via service role
  insert documents row (source='upload', owner_id=null)
  mark upload_tokens.used_at = now()
      ↓
Show confirmation screen with next-steps message
```

**Middleware configuration** — add `/upload` to the Supabase auth middleware bypass list in `src/middleware.ts`:

```typescript
const PUBLIC_ROUTES = ['/', '/auth/', '/upload']
```

---

## 13. Background Jobs

Managed via **Supabase Cron** (pg_cron extension, enabled in `supabase/config.toml`).

| Job | Schedule | Action |
|-----|----------|--------|
| `process-reminders` | Hourly | Dispatch pending reminder emails |
| `scan-expiring-docs` | Daily 08:00 UTC | Find docs expiring within 30 days; create missing reminder rows |
| `recompute-compliance` | Nightly 02:00 UTC | Refresh stale `compliance_snapshots` rows |
| `cleanup-expired-tokens` | Daily | Delete `upload_tokens` where `expires_at < now()` |

### Cron Configuration

```toml
# supabase/config.toml
[db.cron]
enabled = true

[[db.cron.jobs]]
name = "process-reminders"
schedule = "0 * * * *"
command = "select net.http_post(url := 'https://{project}.supabase.co/functions/v1/process-reminders', headers := '{\"Authorization\": \"Bearer {service_role}\"}');"
```

For local development, jobs can be triggered manually via `supabase functions serve` + curl.

---

## 14. Billing & Subscriptions

Billing is **not** a greenfield build. WorkClear reuses Supajump's Stripe integration and extends it with tenant-facing UI, plan limit enforcement, and a fix to scope Stripe operations by `org_id` (not `user.id`).

Implementation reference: IMPLEMENTATION-PLAN **S11** (VR-039, VR-040).

### Subscription Lifecycle

```
User completes onboarding
        ↓
createOrRetrieveCustomer(org_id)  →  billing_customers row
        ↓
Owner visits /settings/billing
        ↓
"Manage billing" → createStripePortal(orgId)  →  Stripe Customer Portal
        ↓
Owner selects plan / starts trial in Stripe
        ↓
Stripe webhook POST /api/webhooks/stripe
        ↓
Upsert billing_products, billing_prices, billing_subscriptions
        ↓
get_organization_billing_status(org_id) returns plan_name + status
        ↓
enforce_counterparty_limit trigger uses plan_name on INSERT
```

Checkout (optional for MVP): `checkoutWithStripe` in `src/lib/stripe/server.ts` can create a subscription session during onboarding. The webhook path is the source of truth for subscription state — the app never stores subscription status independently of Stripe sync.

### Plan Entitlements (MVP)

Product names in Stripe must match the `plan_name` values returned by `get_organization_billing_status` (via `billing_products.name`). Limit enforcement maps plan names in `limits.sql`.

| Plan | Target price | Counterparties | Notes |
|------|-------------|----------------|-------|
| **Starter** | €49/mo | 50 (hard cap) | Default for new orgs without billing data |
| **Growth** | €149/mo | Unlimited | — |
| **Pro** | €299/mo | Unlimited | — |

Prices are configured in the Stripe Dashboard and synced to `billing_prices` via webhooks. The app reads entitlements from `plan_name`; it does not hard-code prices in application code.

### Tenant Billing UI

| Route | Access | Purpose |
|-------|--------|---------|
| `/app/[org_id]/settings/billing` | `owner` only | Current plan, subscription status, billing email, "Manage billing" CTA |
| `/app/[org_id]/settings/limits` | `owner` only | Current usage vs cap, upgrade CTA |

Feature module: `src/features/billing/` (queries, hooks, status card, portal button, limits usage card).

### Key Integration Points

| Component | Location | Change required |
|-----------|----------|-----------------|
| Billing status RPC | `supabase/schemas/billing.sql` | Reuse as-is |
| Stripe webhook | `src/app/api/webhooks/stripe/route.ts` | Reuse as-is |
| Customer portal | `src/lib/stripe/server.ts` | **Fix:** `createStripePortal` must accept `orgId`, not `user.id` |
| Service role client | `src/lib/supabase/admin.ts` | Used by webhook + admin billing portal route |
| Limit enforcement | `supabase/schemas/limits.sql` | **New** (VR-040) |

### Billing Query Layer

```typescript
// src/features/billing/queries/billing.ts
export const billingQueries = {
  getStatus: (supabase, orgId) =>
    supabase.rpc("get_organization_billing_status", { lookup_org_id: orgId }),
  getCounterpartyCount: (supabase, orgId) => /* count from counterparties */,
  getLimitForPlan: (planName) => /* read-only mirror of SQL mapping for UI */,
}
```

Registered in `src/queries/index.ts` as `api.billing`.

---

## 15. Platform Admin Console

The platform admin console is a **cross-tenant** operations surface for WorkClear staff. It is separate from the tenant `admin` RBAC role (which manages a single org's compliance data).

Implementation reference: IMPLEMENTATION-PLAN **S12** (VR-041).

### Authorization

Access is gated by membership in an organization with `type = 'super'`:

```
User navigates to /admin
        ↓
layout.tsx checks: user belongs to org where type = 'super'
        ↓
If yes → render admin shell
If no  → redirect to /auth/login or show 403
```

Platform roles:

| Role | MVP scope |
|------|-----------|
| `SUPER_ADMIN` | Full `/admin` access, org list, billing visibility, open tenant Stripe portal |
| `SUPPORT` | Future — read-only org data, audit logs |

### Routes

| Route | Purpose |
|-------|---------|
| `/admin` | Organization list with billing status, member count, filters |
| `/admin/organizations/[org_id]` | Org detail: billing status, counterparty count, documents count |

### Admin API

| Route | Auth | Purpose |
|-------|------|---------|
| `POST /api/admin/billing-portal/[org_id]` | SUPER_ADMIN only | Service-role fetch of Stripe customer → create billing portal session → return URL |

This route uses the service role to read `billing_customers.customer_id` and calls Stripe's billing portal API. Tenants use the tenant-facing portal button; super-admins use this route from the console.

### Feature Module

```
src/features/platform-admin/
├── components/
│   ├── organizations-table.tsx
│   └── organization-detail-card.tsx
├── hooks/
│   └── use-platform-organizations.ts
└── queries/
    └── platform-admin.ts
```

Data sources per org row:
- `organizations` (name, type, slug)
- `get_organization_billing_status(org_id)` (plan, status)
- `org_memberships` count
- `counterparties` count (detail view)

---

## 16. API Design

All internal. No public REST API in MVP.

**Primary pattern:** Next.js Server Actions via TanStack Query mutations.

**Secondary pattern:** Next.js Route Handlers for operations that require:
- Service role access (upload tokens, vendor upload)
- Webhook handling (Stripe — already exists at `/api/webhooks/stripe`)
- Platform admin billing portal (`/api/admin/billing-portal/[org_id]`)
- Revalidation (`/api/revalidate-tag` — already exists)

### Key Server Actions / Query Functions

Registered in `src/queries/index.ts` under the `api` object:

```typescript
export const api = {
  // existing
  organizations, teams, members, roles, profiles, invitations,
  // new — compliance domain
  counterparties, documents, engagements, requirements, reminders,
  // new — billing & platform ops (S11/S12)
  billing, platformAdmin,
}
```

### Route Handlers Summary

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/webhooks/stripe` | Stripe signature | Sync products, prices, subscriptions |
| POST | `/api/upload-tokens` | Authenticated staff | Generate vendor upload link |
| GET | `/api/upload/validate` | Public (token) | Validate upload token |
| POST | `/api/upload/[token]` | Public (token) | Vendor file upload (service role) |
| POST | `/api/admin/billing-portal/[org_id]` | SUPER_ADMIN | Open tenant Stripe portal |

Function signatures follow the established pattern:

```typescript
// counterparties.ts
export const counterpartiesQueries = {
  getAll: (supabase: SupabaseClient, orgId: string) => Promise<Counterparty[]>
  getById: (supabase: SupabaseClient, id: string) => Promise<Counterparty>
  create: (supabase: SupabaseClient, data: CreateCounterpartyInput) => Promise<Counterparty>
  update: (supabase: SupabaseClient, id: string, data: UpdateCounterpartyInput) => Promise<Counterparty>
  delete: (supabase: SupabaseClient, id: string) => Promise<void>
  getComplianceStatus: (supabase: SupabaseClient, id: string, orgId: string) => Promise<ComplianceStatus>
}
```

---

## 17. Security Model

### Tenant Isolation

Every domain table has RLS enabled. No query can cross tenant boundaries. The `supajump.has_permission()` function verifies `org_id` membership before any data access.

```sql
-- No staff user from org A can see org B counterparties
create policy "rls_counterparties_select" on public.counterparties
for select to authenticated using (
  supajump.has_permission('counterparties', 'view', org_id, null, owner_id)
);
```

### Storage Security

- All document buckets are **private**
- Downloads require a signed URL (60-minute TTL)
- Upload tokens are single-use (marked `used_at`) and expire in 7 days
- Vendor uploads are validated via service role (not client-side trust)

### File Validation

```typescript
const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png']
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB
```

Virus scanning can be added in a later phase via a Storage webhook to an AV service.

### Billing & Platform Admin Security

- `billing_customers` and `billing_subscriptions` have RLS enabled with **no user-facing policies** — tenants read billing state only via the `get_organization_billing_status` RPC, not direct table access.
- Stripe secret key and webhook signing secret are server-only; webhook handler validates `stripe-signature` before processing.
- `/api/admin/billing-portal/[org_id]` requires SUPER_ADMIN membership and runs exclusively on the server with the service role for Stripe customer lookup.
- Plan limits are enforced in PostgreSQL (`BEFORE INSERT` trigger), not in client-side validation alone.

### Audit Trail

`audit_logs` is append-only. No `UPDATE` or `DELETE` policies exist on that table. All significant actions are logged server-side before the response is returned.

### Secret Management

Sensitive values (service role key, Resend API key, Stripe secret) are never exposed to the client. Environment variables are validated via `apps/app/env.mjs` using `@t3-oss/env-nextjs`. New secrets required for WorkClear:

```typescript
// env.mjs additions
APP_URL: z.string().url(),            // used in upload token links
SUPABASE_SERVICE_ROLE: z.string(),    // for vendor upload API route
```

---

## 18. Observability

### Logging

Key events to log (server-side, structured JSON):

```typescript
type LogEvent = {
  level: 'info' | 'warn' | 'error'
  event: string        // 'upload.started' | 'reminder.sent' | 'compliance.computed'
  org_id?: string
  counterparty_id?: string
  duration_ms?: number
  error?: string
}
```

For MVP, logs go to Vercel's built-in logging (accessible in Vercel dashboard). Structured logging is added later with a service like Axiom.

### Error Tracking

Processing failures (Edge Function, upload) are recorded in:
- `reminders.status = 'failed'` + `error_message`
- `audit_logs.payload` for unexpected errors
- Vercel error logs for unhandled exceptions

### Key Metrics (operational, not analytics)

| Metric | How measured |
|--------|-------------|
| Reminder delivery rate | `sent / (sent + failed)` from `reminders` table |
| Upload completion rate | `documents` rows with `storage_path IS NOT NULL` per `upload_tokens` sent |
| Approval flow time | `approved_at - created_at` on `engagements` |
| Blocked dispatch count | `engagements WHERE approval_status = 'blocked'` per org per week |

---

## 19. Deployment Pipeline

### Frontend

```
GitHub (main branch)
      ↓
Vercel (automatic deploy)
      ↓
Preview URLs per PR
      ↓
Production: app.workclear.io
```

### Backend

```
GitHub (supabase/ directory changes)
      ↓
Supabase CLI: supabase db push (migrations)
              supabase functions deploy (Edge Functions)
```

### Branches

| Branch | Environment | Purpose |
|--------|------------|---------|
| `main` | Production | Live customer data |
| `staging` | Staging | Pre-production QA |
| `dev/*` | Preview | Feature development |

### Database Migration Workflow

```bash
# 1. Update schema file in supabase/schemas/
# 2. Stop local Supabase
supabase stop
# 3. Generate migration diff
supabase db diff --use-migra -f 008_counterparties
# 4. Restart and apply
supabase start
supabase migration up
# 5. Regenerate TypeScript types
pnpm db:gen:types
```

---

## 20. Scaling Plan

### Phase 1 — MVP (0–100 tenants)

- Single Supabase project
- Vercel serverless functions
- Compliance status computed on-read (no cache needed at this scale)
- `compliance_snapshots` optional

### Phase 2 — Growth (100–500 tenants)

- Enable `compliance_snapshots` caching with nightly recompute
- Move reminder processing to a dedicated Edge Function with retry logic
- Add read replicas if query latency increases
- Introduce Axiom or Datadog for structured logging

### Phase 3 — Scale (500–1,000+ tenants)

- Extract document processing (OCR / extraction) to external service (AWS Textract, Reducto)
- Shard Edge Function workload across regional deployments
- Consider Supabase pooler (PgBouncer) for high connection count
- Introduce a job queue (Trigger.dev or Inngest) to replace cron-based reminder dispatch

---

## 21. Implementation Order

Following the established Supajump convention: schema first, then `db:gen:types`, then queries, then hooks, then UI, then routes.

Cross-reference: [`docs/IMPLEMENTATION-PLAN.md`](IMPLEMENTATION-PLAN.md) for full PR breakdown (VR-001 → VR-041).

| Week | Sprint | Focus | Key Deliverable |
|------|--------|-------|----------------|
| 1 | S0–S1 | Rebrand + schema | All 6 domain tables, RLS, permission catalog, types regenerated |
| 2 | S3 | Counterparties | List, detail, create/edit, status badge, nav |
| 3 | S4 | Documents | Upload modal, file storage, verify button, counterparty detail tabs |
| 4 | S5 | Compliance engine | DB function, status computation, dashboard stats widget |
| 5 | S6 | Vendor portal | Upload token API, `/upload` public page, token validation |
| 6 | S7 | Engagements + dispatch | Engagement list, create, dispatch approval card |
| 7 | S8 | Reminders | DB trigger, Edge Function cron, email templates |
| 8 | S9 | Requirements + onboarding | Requirement profile form, extended 3-step onboarding |
| 9 | S10 | Hardening | Audit logging, error handling, QA prep |
| 10 | S11 | Tenant billing & limits | Billing settings page, Stripe portal fix, `limits.sql`, limits UI |
| 11 | S12 | Platform ops | `/admin` shell, org list, admin billing portal API |

Release tag **`v0.1.0`** is cut after VR-041 (not VR-038), once billing, limits, and platform admin are complete and the QA checklist passes.

Total estimated MVP + launch ops: **~11 weeks** (~31 working days).

---

## Appendix: Key File Reference

| Area | File |
|------|------|
| RBAC schema | `supabase/schemas/multi_tenant_rbac.sql` |
| Posts (reference feature) | `src/features/posts/` |
| Email service | `src/lib/email/service.ts` |
| Onboarding form | `src/features/profile/onboarding-form.tsx` |
| Navigation | `src/lib/menu-list.tsx` |
| Query API surface | `src/queries/index.ts` |
| Query keys | `src/queries/keys.ts` |
| Stripe webhook | `src/app/api/webhooks/stripe/route.ts` |
| Stripe server helpers | `src/lib/stripe/server.ts` |
| Billing schema + RPC | `supabase/schemas/billing.sql` |
| Plan limits schema | `supabase/schemas/limits.sql` |
| Billing feature module | `src/features/billing/` |
| Platform admin module | `src/features/platform-admin/` |
| Admin billing portal API | `src/app/api/admin/billing-portal/[org_id]/route.ts` |
| Tenant billing page | `src/app/app/[org_id]/settings/billing/page.tsx` |
| Tenant limits page | `src/app/app/[org_id]/settings/limits/page.tsx` |
| Admin console | `src/app/admin/` |
| Implementation plan (S11/S12) | `docs/IMPLEMENTATION-PLAN.md` (VR-039 – VR-041) |
| Invitation API | `src/app/api/invitations/create/route.ts` |
| Middleware (auth guard) | `src/middleware.ts` |
| Environment validation | `apps/app/env.mjs` |
| Plugin architecture | `docs/PLUGIN-ARCHITECTURE-DECISION.md` |
| Registry plan | `docs/REGISTRY-PLAN.md` |
