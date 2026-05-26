# WorkClear — Phased Implementation Plan

Version: v1.0
Architecture reference: `docs/ARCHITECTURE.md`
PRD reference: `docs/` + Cursor plan `vendorready_prd_plan_b00823a7`

---

## How to Use This Document

Each **Sprint** maps to roughly one calendar week of focused work.
Each **PR** is a single, deployable, reviewable unit of work on its own branch.
Each task inside a PR is a concrete action with the exact file paths affected.

### Branch & Commit Convention

```
Branch:  feat/vr-{pr-number}-{short-slug}
         fix/vr-{pr-number}-{short-slug}
         chore/vr-{pr-number}-{short-slug}

Commit:  feat(scope): description
         fix(scope): description
         chore(scope): description
         db(scope): description       ← for schema / migration changes
```

Examples:
```
feat/vr-010-counterparties-queries
db/vr-003-core-domain-schemas
chore/vr-001-env-setup
```

### Definition of Done (per PR)

- [ ] `pnpm lint` passes with no new errors
- [ ] No TypeScript errors (`pnpm build` in `apps/app`)
- [ ] If schema changed: `pnpm db:gen:types` was run and types are committed
- [ ] Squash-merge into `main` with a descriptive commit message

---

## Sprint Map

| Sprint | Theme | PRs | Est. Days |
|--------|-------|-----|-----------|
| S0 | Foundation & Rebrand | VR-001 – VR-002 | 2 |
| S1 | Database Foundation | VR-003 – VR-007 | 3 |
| S2 | App Shell & Navigation | VR-008 – VR-009 | 1.5 |
| S3 | Counterparties Feature | VR-010 – VR-013 | 3 |
| S4 | Documents Feature | VR-014 – VR-017 | 3 |
| S5 | Compliance Dashboard | VR-018 – VR-020 | 2 |
| S6 | Vendor Upload Portal | VR-021 – VR-023 | 2 |
| S7 | Engagements & Dispatch | VR-024 – VR-027 | 3 |
| S8 | Reminder Engine | VR-028 – VR-031 | 3 |
| S9 | Requirements & Onboarding | VR-032 – VR-034 | 2 |
| S10 | Hardening & Polish | VR-035 – VR-038 | 2 |
| S11 | Tenant Billing & Limits | VR-039 – VR-040 | 3 |
| S12 | Platform Ops (Super Admin) | VR-041 | 2 |

**Total: ~31 working days (MVP + launch operations layer)**

---

## Sprint 0 — Foundation & Rebrand

Goal: clean working environment with WorkClear identity. No new features.

---

### VR-001 · Environment & Config Setup

**Branch:** `chore/vr-001-env-config`

#### Tasks

1. **`apps/app/env.mjs`** — add new required server-side vars:

   ```typescript
   APP_URL: z.string().url(),
   SUPABASE_SERVICE_ROLE: z.string().min(1),
   ```

   Also rename/alias: keep `EMAIL_API_KEY` but add explicit `RESEND_API_KEY` optional variant if `EMAIL_PROVIDER=resend`.

2. **`apps/app/.env.local`** — add placeholders:

   ```
   APP_URL=http://localhost:3000
   SUPABASE_SERVICE_ROLE=your-service-role-key
   ```

3. **`apps/app/.env.example`** (create if missing) — document all vars with comments:

   ```
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE=

   # App
   APP_URL=https://app.workclear.io

   # Email (choose one provider)
   EMAIL_PROVIDER=resend        # or: ses
   EMAIL_API_KEY=               # Resend API key or SES credential

   # Stripe
   STRIPE_SECRET_KEY=
   STRIPE_WEBHOOK_SECRET=
   ```

4. **`supabase/config.toml`** — verify `[storage]` section is enabled (not commented out):

   ```toml
   [storage]
   enabled = true
   file_size_limit = "50MiB"
   ```

5. **`apps/app/src/lib/supabase/service.ts`** (create) — service role client for server-only operations:

   ```typescript
   import { createClient } from "@supabase/supabase-js"
   import { Database } from "@/lib/database.types"

   export function createServiceClient() {
     return createClient<Database>(
       process.env.NEXT_PUBLIC_SUPABASE_URL!,
       process.env.SUPABASE_SERVICE_ROLE!
     )
   }
   ```

#### Acceptance Criteria
- [ ] `pnpm build` in `apps/app` passes (env validation does not throw)
- [ ] Service client file is importable from route handlers
- [ ] `.env.example` documents all vars

---

### VR-002 · Rebrand to WorkClear

**Branch:** `chore/vr-002-rebrand`

#### Tasks

1. **`apps/app/src/app/layout.tsx`** — update `<title>`, `description` metadata:

   ```typescript
   export const metadata: Metadata = {
     title: "WorkClear",
     description: "Know a contractor is cleared before work starts.",
   }
   ```

2. **`apps/app/src/app/page.tsx`** — replace Supajump landing copy with WorkClear landing:
   - Headline: "Know a contractor is cleared before work starts"
   - Sub-headline: "Replace spreadsheet COI tracking with automated compliance operations"
   - CTA: "Start for free" → `/auth/sign-up`

3. **`apps/app/src/components/app-sidebar.tsx`** — update product name / logo text from "Supajump" to "WorkClear":

   Search for any hardcoded "Supajump" string and replace.

4. **`apps/app/src/features/auth/`** — update email subjects and body copy in invitation email (`src/app/api/invitations/create/route.ts`) from "Supajump" to "WorkClear".

5. **`apps/app/src/lib/email/service.ts`** — update default `from` address if hardcoded:

   ```typescript
   const DEFAULT_FROM = "WorkClear <noreply@workclear.io>"
   ```

6. **`apps/app/src/features/profile/onboarding-form.tsx`** — update placeholder labels ("Organization Name" → "Company Name", "Team Name" → keep or rename to "Workspace").

7. Search entire `apps/app/src/` for remaining "supajump" or "Supajump" strings and replace. Use:

   ```bash
   rg -i "supajump" apps/app/src/ --type ts --type tsx -l
   ```

#### Acceptance Criteria
- [ ] No "Supajump" text visible in the running app UI
- [ ] Browser tab shows "WorkClear"
- [ ] Invitation email subject says "WorkClear"

---

## Sprint 1 — Database Foundation

Goal: all domain tables exist locally, RLS is enforced, TypeScript types are up to date. Nothing renders in the UI yet — this is pure DB work.

---

### VR-003 · Core Domain Schemas: Counterparties & Documents

**Branch:** `db/vr-003-core-domain-schemas`

#### Tasks

1. **Create `supabase/schemas/counterparties.sql`**:

   ```sql
   create table if not exists public.counterparties (
     id            uuid primary key default gen_random_uuid(),
     created_at    timestamptz default now(),
     updated_at    timestamptz,
     org_id        uuid not null references public.organizations(id) on delete cascade,
     owner_id      uuid references auth.users(id) on delete set null default auth.uid(),
     legal_name    text not null,
     roles         text[] default '{}',
     contact_email text,
     notes         text
   );

   alter table public.counterparties enable row level security;

   create index counterparties_org_id_idx     on public.counterparties using btree (org_id);
   create index counterparties_email_idx      on public.counterparties using btree (contact_email);
   create index counterparties_created_at_idx on public.counterparties using btree (created_at desc);

   create or replace trigger set_counterparties_timestamp
     before insert or update on public.counterparties
     for each row execute function supajump.trigger_set_timestamps();

   create policy "rls_counterparties_select" on public.counterparties
     for select to authenticated using (
       supajump.has_permission('counterparties', 'view', org_id, null, owner_id)
     );
   create policy "rls_counterparties_insert" on public.counterparties
     for insert to authenticated with check (
       supajump.has_permission('counterparties', 'create', org_id, null, owner_id)
     );
   create policy "rls_counterparties_update" on public.counterparties
     for update to authenticated with check (
       supajump.has_permission('counterparties', 'edit', org_id, null, owner_id)
     );
   create policy "rls_counterparties_delete" on public.counterparties
     for delete to authenticated using (
       supajump.has_permission('counterparties', 'delete', org_id, null, owner_id)
     );
   ```

2. **Create `supabase/schemas/documents.sql`**:

   ```sql
   create table if not exists public.documents (
     id                  uuid primary key default gen_random_uuid(),
     created_at          timestamptz default now(),
     counterparty_id     uuid not null references public.counterparties(id) on delete cascade,
     org_id              uuid not null references public.organizations(id) on delete cascade,
     owner_id            uuid references auth.users(id) on delete set null,
     document_type       text not null,
     storage_path        text,
     file_name           text,
     file_size_bytes     bigint,
     mime_type           text,
     expires_at          date,
     verified            boolean default false,
     verified_at         timestamptz,
     verified_by         uuid references auth.users(id),
     extracted_data      jsonb default '{}',
     source              text default 'upload',
     metadata            jsonb default '{}',
     constraint documents_type_check check (
       document_type in ('coi', 'w9', 'license', 'other')
     ),
     constraint documents_source_check check (
       source in ('upload', 'email', 'api')
     )
   );

   alter table public.documents enable row level security;

   create index documents_counterparty_id_idx on public.documents using btree (counterparty_id);
   create index documents_org_id_idx          on public.documents using btree (org_id);
   create index documents_expires_at_idx      on public.documents using btree (expires_at);
   create index documents_type_idx            on public.documents using btree (document_type);

   create policy "rls_documents_select" on public.documents
     for select to authenticated using (
       supajump.has_permission('documents', 'view', org_id, null, owner_id)
     );
   create policy "rls_documents_insert" on public.documents
     for insert to authenticated with check (
       supajump.has_permission('documents', 'create', org_id, null, owner_id)
     );
   create policy "rls_documents_update" on public.documents
     for update to authenticated with check (
       supajump.has_permission('documents', 'edit', org_id, null, owner_id)
     );
   create policy "rls_documents_delete" on public.documents
     for delete to authenticated using (
       supajump.has_permission('documents', 'delete', org_id, null, owner_id)
     );
   ```

3. **Add both files to `supabase/config.toml`** `schema_paths`:

   ```toml
   schema_paths = [
     "./schemas/setup.sql",
     "./schemas/multi_tenant_rbac.sql",
     "./schemas/profiles.sql",
     "./schemas/billing.sql",
     "./schemas/invitations.sql",
     "./schemas/posts.sql",
     "./schemas/counterparties.sql",    # new
     "./schemas/documents.sql",         # new
   ]
   ```

4. **Generate migration**:

   ```bash
   supabase stop
   supabase db diff --use-migra -f 008_counterparties_and_documents
   supabase start
   supabase migration up
   pnpm db:gen:types
   ```

#### Acceptance Criteria
- [ ] Tables visible in Supabase local dashboard
- [ ] RLS policies listed on both tables
- [ ] `database.types.ts` includes `counterparties` and `documents` row types

---

### VR-004 · Secondary Domain Schemas

**Branch:** `db/vr-004-secondary-schemas`

Depends on: VR-003 (counterparties + documents must exist first)

#### Tasks

1. **Create `supabase/schemas/requirement_profiles.sql`**:

   ```sql
   create table if not exists public.requirement_profiles (
     id         uuid primary key default gen_random_uuid(),
     created_at timestamptz default now(),
     updated_at timestamptz,
     org_id     uuid not null references public.organizations(id) on delete cascade,
     name       text not null,
     is_default boolean default false,
     rules_json jsonb default '[]'
   );

   alter table public.requirement_profiles enable row level security;

   create index requirement_profiles_org_id_idx on public.requirement_profiles using btree (org_id);

   create or replace trigger set_requirement_profiles_timestamp
     before insert or update on public.requirement_profiles
     for each row execute function supajump.trigger_set_timestamps();

   create policy "rls_requirement_profiles_select" on public.requirement_profiles
     for select to authenticated using (
       supajump.has_permission('requirement_profiles', 'view', org_id, null, null)
     );
   create policy "rls_requirement_profiles_insert" on public.requirement_profiles
     for insert to authenticated with check (
       supajump.has_permission('requirement_profiles', 'create', org_id, null, null)
     );
   create policy "rls_requirement_profiles_update" on public.requirement_profiles
     for update to authenticated with check (
       supajump.has_permission('requirement_profiles', 'edit', org_id, null, null)
     );
   create policy "rls_requirement_profiles_delete" on public.requirement_profiles
     for delete to authenticated using (
       supajump.has_permission('requirement_profiles', 'delete', org_id, null, null)
     );
   ```

2. **Create `supabase/schemas/engagements.sql`**:

   ```sql
   create table if not exists public.engagements (
     id              uuid primary key default gen_random_uuid(),
     created_at      timestamptz default now(),
     updated_at      timestamptz,
     org_id          uuid not null references public.organizations(id) on delete cascade,
     owner_id        uuid references auth.users(id) on delete set null default auth.uid(),
     counterparty_id uuid not null references public.counterparties(id),
     property_name   text,
     scheduled_date  date,
     engagement_type text,
     approval_status text default 'pending',
     approved_at     timestamptz,
     approved_by     uuid references auth.users(id),
     blocked_reason  text,
     notes           text,
     constraint engagements_approval_status_check check (
       approval_status in ('pending', 'approved', 'blocked')
     )
   );

   alter table public.engagements enable row level security;

   create index engagements_org_id_idx          on public.engagements using btree (org_id);
   create index engagements_counterparty_id_idx on public.engagements using btree (counterparty_id);
   create index engagements_scheduled_date_idx  on public.engagements using btree (scheduled_date);
   create index engagements_status_idx          on public.engagements using btree (approval_status);

   create or replace trigger set_engagements_timestamp
     before insert or update on public.engagements
     for each row execute function supajump.trigger_set_timestamps();

   -- RLS (same pattern)
   ```

3. **Create `supabase/schemas/reminders.sql`**:

   ```sql
   create table if not exists public.reminders (
     id              uuid primary key default gen_random_uuid(),
     created_at      timestamptz default now(),
     org_id          uuid not null references public.organizations(id) on delete cascade,
     counterparty_id uuid references public.counterparties(id) on delete cascade,
     document_id     uuid references public.documents(id) on delete cascade,
     reminder_type   text not null,
     send_at         timestamptz not null,
     sent_at         timestamptz,
     status          text default 'pending',
     error_message   text,
     constraint reminders_type_check check (
       reminder_type in ('expiry_30', 'expiry_14', 'expiry_7', 'missing_doc', 'manual')
     ),
     constraint reminders_status_check check (
       status in ('pending', 'sent', 'failed')
     )
   );

   alter table public.reminders enable row level security;

   create index reminders_org_id_idx      on public.reminders using btree (org_id);
   create index reminders_send_at_idx     on public.reminders using btree (send_at);
   create index reminders_status_idx      on public.reminders using btree (status);
   create index reminders_document_id_idx on public.reminders using btree (document_id);

   -- RLS: org members can view reminders for their org
   create policy "rls_reminders_select" on public.reminders
     for select to authenticated using (
       org_id in (select supajump.get_organizations_for_current_user())
     );
   ```

4. **Create `supabase/schemas/upload_tokens.sql`**:

   ```sql
   create table if not exists public.upload_tokens (
     id              uuid primary key default gen_random_uuid(),
     created_at      timestamptz default now(),
     counterparty_id uuid not null references public.counterparties(id) on delete cascade,
     org_id          uuid not null references public.organizations(id) on delete cascade,
     token           text not null unique default encode(gen_random_bytes(32), 'hex'),
     expires_at      timestamptz not null,
     used_at         timestamptz,
     created_by      uuid references auth.users(id)
   );

   alter table public.upload_tokens enable row level security;

   create index upload_tokens_token_idx      on public.upload_tokens using btree (token);
   create index upload_tokens_expires_at_idx on public.upload_tokens using btree (expires_at);

   -- No SELECT policy — service role only. Staff can insert via API route.
   create policy "rls_upload_tokens_insert" on public.upload_tokens
     for insert to authenticated with check (
       org_id in (select supajump.get_organizations_for_current_user())
     );
   ```

5. **Create `supabase/schemas/audit_logs.sql`**:

   ```sql
   create table if not exists public.audit_logs (
     id         uuid primary key default gen_random_uuid(),
     created_at timestamptz default now(),
     org_id     uuid not null,
     user_id    uuid references auth.users(id),
     entity     text not null,
     entity_id  uuid,
     event      text not null,
     payload    jsonb default '{}',
     ip_address text
   );

   alter table public.audit_logs enable row level security;

   create index audit_logs_org_id_idx     on public.audit_logs using btree (org_id);
   create index audit_logs_entity_id_idx  on public.audit_logs using btree (entity_id);
   create index audit_logs_created_at_idx on public.audit_logs using btree (created_at desc);

   -- Append-only: no UPDATE, no DELETE
   create policy "rls_audit_logs_select" on public.audit_logs
     for select to authenticated using (
       org_id in (select supajump.get_organizations_for_current_user())
     );
   create policy "rls_audit_logs_insert" on public.audit_logs
     for insert to authenticated with check (
       org_id in (select supajump.get_organizations_for_current_user())
     );
   ```

6. **Update `supabase/config.toml`** schema_paths with all 4 new files.

7. **Generate migration + regenerate types**:

   ```bash
   supabase stop
   supabase db diff --use-migra -f 009_secondary_schemas
   supabase start
   supabase migration up
   pnpm db:gen:types
   ```

#### Acceptance Criteria
- [ ] All 4 new tables in local Supabase dashboard
- [ ] `database.types.ts` updated
- [ ] `pnpm lint` passes

---

### VR-005 · RBAC Permission Catalog Extensions

**Branch:** `db/vr-005-rbac-permissions`

Depends on: VR-003, VR-004

#### Tasks

1. **Edit `supabase/schemas/multi_tenant_rbac.sql`** — add to the `permission_catalog` seed block (after existing `posts` entries):

   ```sql
   -- === WorkClear permissions ===
   -- counterparties
   ('organization', 'owner',   'counterparties', 'view',   'all', true,  null),
   ('organization', 'owner',   'counterparties', 'create', 'all', true,  null),
   ('organization', 'owner',   'counterparties', 'edit',   'all', true,  null),
   ('organization', 'owner',   'counterparties', 'delete', 'all', true,  null),
   ('organization', 'admin',   'counterparties', 'view',   'all', false, null),
   ('organization', 'admin',   'counterparties', 'create', 'all', false, null),
   ('organization', 'admin',   'counterparties', 'edit',   'all', false, null),
   ('organization', 'admin',   'counterparties', 'delete', 'all', false, null),
   ('organization', 'member',  'counterparties', 'view',   'all', false, null),
   ('organization', 'member',  'counterparties', 'create', 'all', false, null),
   ('organization', 'member',  'counterparties', 'edit',   'own', false, null),

   -- documents
   ('organization', 'owner',   'documents', 'view',   'all', true,  null),
   ('organization', 'owner',   'documents', 'create', 'all', true,  null),
   ('organization', 'owner',   'documents', 'edit',   'all', true,  null),
   ('organization', 'owner',   'documents', 'delete', 'all', true,  null),
   ('organization', 'admin',   'documents', 'view',   'all', false, null),
   ('organization', 'admin',   'documents', 'create', 'all', false, null),
   ('organization', 'admin',   'documents', 'edit',   'all', false, null),
   ('organization', 'member',  'documents', 'view',   'all', false, null),
   ('organization', 'member',  'documents', 'create', 'all', false, null),

   -- engagements
   ('organization', 'owner',   'engagements', 'view',   'all', true,  null),
   ('organization', 'owner',   'engagements', 'create', 'all', true,  null),
   ('organization', 'owner',   'engagements', 'edit',   'all', true,  null),
   ('organization', 'owner',   'engagements', 'delete', 'all', true,  null),
   ('organization', 'admin',   'engagements', 'view',   'all', false, null),
   ('organization', 'admin',   'engagements', 'create', 'all', false, null),
   ('organization', 'admin',   'engagements', 'edit',   'all', false, null),
   ('organization', 'member',  'engagements', 'view',   'all', false, null),
   ('organization', 'member',  'engagements', 'create', 'all', false, null),

   -- requirement_profiles
   ('organization', 'owner',   'requirement_profiles', 'view',   'all', true,  null),
   ('organization', 'owner',   'requirement_profiles', 'create', 'all', true,  null),
   ('organization', 'owner',   'requirement_profiles', 'edit',   'all', true,  null),
   ('organization', 'owner',   'requirement_profiles', 'delete', 'all', true,  null),
   ('organization', 'admin',   'requirement_profiles', 'view',   'all', false, null),
   ('organization', 'admin',   'requirement_profiles', 'create', 'all', false, null),
   ('organization', 'admin',   'requirement_profiles', 'edit',   'all', false, null),
   ('organization', 'member',  'requirement_profiles', 'view',   'all', false, null)
   ```

   Add with `ON CONFLICT DO NOTHING` so re-running is safe.

2. **Generate migration**:

   ```bash
   supabase stop
   supabase db diff --use-migra -f 010_rbac_workclear_permissions
   supabase start
   supabase migration up
   ```

3. **Update `supabase/seed.sql`** — verify that the org seed creates counterparties/documents permissions for a test user (smoke test only).

#### Acceptance Criteria
- [ ] New permissions visible in `supajump.permission_catalog` table
- [ ] Existing `pnpm lint` still passes
- [ ] A seed org's owner role inherits counterparties all-action permissions

---

### VR-006 · Compliance Engine DB Function

**Branch:** `db/vr-006-compliance-engine`

Depends on: VR-003, VR-004, VR-005

#### Tasks

1. **Add to `supabase/schemas/multi_tenant_rbac.sql`** (or new `supabase/schemas/compliance.sql`) the `compute_compliance_status` function:

   ```sql
   create or replace function supajump.compute_compliance_status(
     _counterparty_id uuid,
     _org_id          uuid
   ) returns jsonb
   language plpgsql stable security definer as $$
   declare
     v_profile    record;
     v_rule       jsonb;
     v_status     text := 'pending';
     v_warnings   jsonb := '[]';
     v_blocked    jsonb := '[]';
     v_doc_count  integer;
   begin
     -- 1. Find default requirement profile for this org
     select * into v_profile
       from public.requirement_profiles
      where org_id = _org_id and is_default = true
      limit 1;

     if not found then
       return jsonb_build_object('status', 'pending', 'reason', 'no_profile', 'checked_at', now());
     end if;

     -- 2. Evaluate each rule
     for v_rule in select * from jsonb_array_elements(v_profile.rules_json)
     loop
       declare
         v_doc_type    text := v_rule->>'document_type';
         v_required    boolean := (v_rule->>'required')::boolean;
         v_warn_days   integer := coalesce((v_rule->>'warn_days_before_expiry')::integer, 30);
         v_best_doc    record;
       begin
         -- Find the most recent verified document of this type
         select * into v_best_doc
           from public.documents
          where counterparty_id = _counterparty_id
            and document_type = v_doc_type
            and verified = true
          order by created_at desc
          limit 1;

         if not found then
           if v_required then
             v_blocked := v_blocked || jsonb_build_object('rule', v_doc_type, 'reason', 'missing');
           end if;
         elsif v_best_doc.expires_at is not null then
           if v_best_doc.expires_at < current_date then
             v_blocked := v_blocked || jsonb_build_object('rule', v_doc_type, 'reason', 'expired', 'expired_at', v_best_doc.expires_at);
           elsif v_best_doc.expires_at <= current_date + (v_warn_days || ' days')::interval then
             v_warnings := v_warnings || jsonb_build_object('rule', v_doc_type, 'reason', 'expiring_soon', 'expires_at', v_best_doc.expires_at);
           end if;
         end if;
       end;
     end loop;

     -- 3. Aggregate
     if jsonb_array_length(v_blocked) > 0 then
       v_status := 'blocked';
     elsif jsonb_array_length(v_warnings) > 0 then
       v_status := 'warning';
     else
       -- Check if any verified docs exist at all
       select count(*) into v_doc_count
         from public.documents
        where counterparty_id = _counterparty_id and verified = true;

       v_status := case when v_doc_count > 0 then 'ready' else 'pending' end;
     end if;

     return jsonb_build_object(
       'status',       v_status,
       'blocked',      v_blocked,
       'warnings',     v_warnings,
       'checked_at',   now()
     );
   end;
   $$;
   ```

2. **Add compliance stats RPC** (for dashboard widgets):

   ```sql
   create or replace function public.get_compliance_stats(_org_id uuid)
   returns jsonb
   language plpgsql stable security definer as $$
   declare
     v_result jsonb;
   begin
     select jsonb_build_object(
       'total',   count(*),
       'ready',   count(*) filter (where (supajump.compute_compliance_status(id, _org_id)->>'status') = 'ready'),
       'warning', count(*) filter (where (supajump.compute_compliance_status(id, _org_id)->>'status') = 'warning'),
       'blocked', count(*) filter (where (supajump.compute_compliance_status(id, _org_id)->>'status') = 'blocked'),
       'pending', count(*) filter (where (supajump.compute_compliance_status(id, _org_id)->>'status') = 'pending')
     ) into v_result
     from public.counterparties
     where org_id = _org_id;

     return v_result;
   end;
   $$;
   ```

3. **Generate migration + regenerate types**:

   ```bash
   supabase stop
   supabase db diff --use-migra -f 011_compliance_engine
   supabase start
   supabase migration up
   pnpm db:gen:types
   ```

#### Acceptance Criteria
- [ ] `select supajump.compute_compliance_status('{uuid}', '{uuid}')` returns a valid jsonb result in local SQL editor
- [ ] `select get_compliance_stats('{org_uuid}')` returns counts object

---

### VR-007 · Storage Bucket Configuration

**Branch:** `chore/vr-007-storage-config`

#### Tasks

1. **`supabase/config.toml`** — uncomment / add the `documents` bucket config:

   ```toml
   [[storage.buckets]]
   name = "documents"
   public = false
   file_size_limit = "10MiB"
   allowed_mime_types = ["application/pdf", "image/jpeg", "image/png", "image/webp"]
   ```

2. **Create `supabase/schemas/storage_policies.sql`** — Storage RLS for the documents bucket:

   ```sql
   -- Staff in org can read/write objects under their org prefix
   create policy "documents_select_policy"
     on storage.objects for select to authenticated
     using (
       bucket_id = 'documents'
       and (storage.foldername(name))[1] in (
         select id::text from supajump.get_organizations_for_current_user() as t(id)
       )
     );

   create policy "documents_insert_policy"
     on storage.objects for insert to authenticated
     with check (
       bucket_id = 'documents'
       and (storage.foldername(name))[1] in (
         select id::text from supajump.get_organizations_for_current_user() as t(id)
       )
     );

   create policy "documents_delete_policy"
     on storage.objects for delete to authenticated
     using (
       bucket_id = 'documents'
       and (storage.foldername(name))[1] in (
         select id::text from supajump.get_organizations_for_current_user() as t(id)
       )
     );
   ```

3. **Add to `supabase/config.toml`** schema_paths.

4. **Restart Supabase** to apply bucket config:

   ```bash
   supabase stop && supabase start
   ```

#### Acceptance Criteria
- [ ] `documents` bucket visible in Supabase local Storage dashboard
- [ ] Bucket is not public
- [ ] MIME type restrictions are active

---

## Sprint 2 — App Shell & Navigation

Goal: WorkClear navigation structure in place, routes scaffolded (pages can be empty shells).

---

### VR-008 · Navigation & Route Scaffold

**Branch:** `feat/vr-008-navigation-scaffold`

Depends on: VR-002

#### Tasks

1. **`apps/app/src/lib/menu-list.tsx`** — replace `useNavMain` contents with WorkClear nav:

   ```typescript
   // Compliance group
   { title: "Dashboard",        url: `/app/${org_id}`,                    icon: ShieldCheck },
   { title: "Counterparties",   url: `/app/${org_id}/counterparties`,      icon: Building2 },
   { title: "Engagements",      url: `/app/${org_id}/engagements`,         icon: CalendarCheck2 },

   // Organization group (existing, keep as-is)
   Members / Invitations / Roles

   // Settings group
   { title: "Requirements",  url: `/app/${org_id}/settings/requirements`,  icon: ListChecks },
   { title: "General",       url: `/app/${org_id}/settings`,               icon: Settings2 },
   ```

   Remove all Posts-related nav entries.

2. **Scaffold empty route pages** (these are placeholder shells — `<p>Coming soon</p>` is fine):

   - `apps/app/src/app/app/[org_id]/counterparties/page.tsx`
   - `apps/app/src/app/app/[org_id]/counterparties/[counterparty_id]/page.tsx`
   - `apps/app/src/app/app/[org_id]/engagements/page.tsx`
   - `apps/app/src/app/app/[org_id]/engagements/[engagement_id]/page.tsx`
   - `apps/app/src/app/app/[org_id]/settings/requirements/page.tsx`

   Each scaffold should include:

   ```typescript
   import { DashboardHeader } from "@/components/dashboard-header"
   import { DashboardShell } from "@/components/dashboard-shell"

   export default function CounterpartiesPage() {
     return (
       <DashboardShell>
         <DashboardHeader heading="Counterparties" text="Manage your vendor registry." />
         <p className="text-muted-foreground text-sm">Coming soon.</p>
       </DashboardShell>
     )
   }
   ```

3. **Update `apps/app/src/app/app/[org_id]/page.tsx`** — make this the primary dashboard entry (not the team-scoped one). If the org has no teams this already loads; verify.

4. **Remove Posts nav references** from sidebar but do NOT delete post route files yet (breaking changes risk).

#### Acceptance Criteria
- [ ] App sidebar shows Compliance / Organization / Settings groups
- [ ] Clicking Counterparties, Engagements, Requirements navigates to scaffold pages without 404
- [ ] No Posts entries visible in sidebar

---

### VR-009 · Org-Scoped Layout

**Branch:** `feat/vr-009-org-layout`

#### Tasks

1. **`apps/app/src/app/app/[org_id]/layout.tsx`** — verify it handles the case where `team_id` is absent (WorkClear routes are org-scoped). The existing layout prefetches `organizationsKeys.allWithTeams()` — this is fine, leave it.

2. **Create `apps/app/src/app/app/[org_id]/counterparties/layout.tsx`** (minimal shell to scope breadcrumbs):

   ```typescript
   export default function CounterpartiesLayout({ children }: { children: React.ReactNode }) {
     return <>{children}</>
   }
   ```

3. **Update breadcrumbs** in `src/components/breadcrumbs.tsx` (if it reads from the URL) — verify `counterparties` and `engagements` produce readable breadcrumb segments.

#### Acceptance Criteria
- [ ] Breadcrumbs render correctly on scaffold pages
- [ ] No console errors on org-scoped routes

---

## Sprint 3 — Counterparties Feature

Goal: staff can create, list, search, and view counterparties. Compliance status badge shows "pending" (engine wired, no documents yet).

---

### VR-010 · Counterparties Queries, Keys & Hooks

**Branch:** `feat/vr-010-counterparties-data-layer`

Depends on: VR-003, VR-006

#### Tasks

1. **Create `apps/app/src/features/counterparties/queries/counterparties.ts`**:

   ```typescript
   import { SupabaseClient } from "@supabase/supabase-js"
   import { Database } from "@/lib/database.types"

   type Supabase = SupabaseClient<Database>

   export const counterpartiesQueries = {
     async getAll(supabase: Supabase, orgId: string) {
       const { data, error } = await supabase
         .from("counterparties")
         .select("*")
         .eq("org_id", orgId)
         .order("created_at", { ascending: false })
       if (error) throw error
       return data
     },

     async getById(supabase: Supabase, id: string) {
       const { data, error } = await supabase
         .from("counterparties")
         .select("*")
         .eq("id", id)
         .single()
       if (error) throw error
       return data
     },

     async create(supabase: Supabase, payload: {
       org_id: string
       legal_name: string
       roles: string[]
       contact_email?: string
       notes?: string
     }) {
       const { data, error } = await supabase
         .from("counterparties")
         .insert(payload)
         .select()
         .single()
       if (error) throw error
       return data
     },

     async update(supabase: Supabase, id: string, payload: Partial<{
       legal_name: string
       roles: string[]
       contact_email: string
       notes: string
     }>) {
       const { data, error } = await supabase
         .from("counterparties")
         .update(payload)
         .eq("id", id)
         .select()
         .single()
       if (error) throw error
       return data
     },

     async delete(supabase: Supabase, id: string) {
       const { error } = await supabase
         .from("counterparties")
         .delete()
         .eq("id", id)
       if (error) throw error
     },

     async getComplianceStatus(supabase: Supabase, counterpartyId: string, orgId: string) {
       const { data, error } = await supabase.rpc("compute_compliance_status", {
         _counterparty_id: counterpartyId,
         _org_id: orgId,
       })
       if (error) throw error
       return data as { status: string; blocked: unknown[]; warnings: unknown[]; checked_at: string }
     },
   }
   ```

2. **`apps/app/src/queries/keys.ts`** — add counterparty keys:

   ```typescript
   export const counterpartiesKeys = {
     all: () => ["counterparties"] as const,
     list: (orgId: string) => ["counterparties", orgId] as const,
     detail: (id: string) => ["counterparty", id] as const,
     compliance: (id: string) => ["counterparty", id, "compliance"] as const,
   }
   ```

3. **`apps/app/src/queries/index.ts`** — register:

   ```typescript
   import { counterpartiesQueries } from "@/features/counterparties/queries/counterparties"
   export const api = {
     // ... existing
     counterparties: counterpartiesQueries,
   }
   ```

4. **Create `apps/app/src/features/counterparties/hooks/use-counterparties.ts`**:

   ```typescript
   export function useCounterparties(orgId: string) { ... }
   export function useCounterparty(id: string) { ... }
   export function useCounterpartyCompliance(id: string, orgId: string) { ... }
   export function useCreateCounterparty(orgId: string) { ... }
   export function useUpdateCounterparty(id: string, orgId: string) { ... }
   export function useDeleteCounterparty(orgId: string) { ... }
   ```

   Each mutation hook invalidates `counterpartiesKeys.list(orgId)` on success and shows a `toast.success` / `toast.error`.

#### Acceptance Criteria
- [ ] TypeScript compiles with no errors
- [ ] `api.counterparties` is accessible in `src/queries/index.ts`

---

### VR-011 · Counterparties List Page

**Branch:** `feat/vr-011-counterparties-list`

Depends on: VR-010

#### Tasks

1. **Create `apps/app/src/features/counterparties/compliance-status-badge.tsx`**:

   ```typescript
   const STATUS_CONFIG = {
     ready:   { label: "Ready",   className: "bg-green-100 text-green-800" },
     warning: { label: "Warning", className: "bg-amber-100 text-amber-800" },
     blocked: { label: "Blocked", className: "bg-red-100 text-red-800" },
     pending: { label: "Pending", className: "bg-gray-100 text-gray-600" },
   }
   export function ComplianceStatusBadge({ status }: { status: string }) { ... }
   ```

2. **Create `apps/app/src/features/counterparties/columns.tsx`** — TanStack Table column definitions:
   - Legal Name (linked to detail)
   - Roles (comma-separated pills)
   - Contact Email
   - Compliance Status (`ComplianceStatusBadge`)
   - Created At
   - Actions column (edit, delete)

3. **Create `apps/app/src/features/counterparties/counterparties-table.tsx`** — client component:
   - Uses `useCounterparties(orgId)` hook
   - Renders `DataTable` with the columns above
   - Shows skeleton (`CounterpartiesTableSkeleton`) while loading
   - Includes search input (filter by `legal_name`)
   - Includes status filter (dropdown: All / Ready / Warning / Blocked / Pending)

4. **Update `apps/app/src/app/app/[org_id]/counterparties/page.tsx`** — replace scaffold with real RSC:

   ```typescript
   export default async function CounterpartiesPage({ params }) {
     const { org_id } = await params
     const supabase = await createClient()
     const queryClient = getQueryClient()

     await queryClient.prefetchQuery({
       // eslint-disable-next-line @tanstack/query/exhaustive-deps
       queryKey: counterpartiesKeys.list(org_id),
       queryFn: () => api.counterparties.getAll(supabase, org_id),
     })

     return (
       <DashboardShell>
         <DashboardHeader heading="Counterparties" text="Manage your vendor registry.">
           <CreateCounterpartyModal orgId={org_id} />
         </DashboardHeader>
         <HydrationBoundary state={dehydrate(queryClient)}>
           <CounterpartiesTable orgId={org_id} />
         </HydrationBoundary>
       </DashboardShell>
     )
   }
   ```

#### Acceptance Criteria
- [ ] Counterparties page renders real data (or empty state)
- [ ] Table is searchable by legal name
- [ ] Status filter works client-side
- [ ] Skeleton renders during loading

---

### VR-012 · Create Counterparty Modal

**Branch:** `feat/vr-012-create-counterparty`

Depends on: VR-011

#### Tasks

1. **Create `apps/app/src/features/counterparties/create-counterparty-modal.tsx`**:
   - Trigger: Button "Add Counterparty"
   - Dialog with `react-hook-form` + `zod` schema validation
   - Fields:
     - `legal_name` (required, text)
     - `roles` (multi-select checkboxes: Vendor, Contractor, Subcontractor, Supplier, Service Provider)
     - `contact_email` (optional, email format)
     - `notes` (optional, textarea)
   - Submit calls `useCreateCounterparty(orgId)`
   - On success: closes modal, toast, list invalidates

2. **`zod` schema** in `apps/app/src/features/counterparties/schemas.ts`:

   ```typescript
   export const createCounterpartySchema = z.object({
     legal_name: z.string().min(2, "Name must be at least 2 characters"),
     roles: z.array(z.string()).min(1, "Select at least one role"),
     contact_email: z.string().email("Invalid email").optional().or(z.literal("")),
     notes: z.string().optional(),
   })
   ```

#### Acceptance Criteria
- [ ] Form validates before submit
- [ ] New counterparty appears in list immediately (optimistic update or refetch)
- [ ] Modal closes and shows success toast

---

### VR-013 · Counterparty Detail Page

**Branch:** `feat/vr-013-counterparty-detail`

Depends on: VR-011, VR-012

#### Tasks

1. **Create `apps/app/src/features/counterparties/counterparty-detail.tsx`** — tabbed layout:
   - Tab 1: **Overview** — profile info (legal name, roles pills, contact email, notes) + edit inline or Edit button
   - Tab 2: **Documents** — `DocumentsTable` component (stubbed in this PR, wired in VR-015)
   - Tab 3: **Timeline** — chronological audit log for this counterparty (stubbed)

2. **Update `apps/app/src/app/app/[org_id]/counterparties/[counterparty_id]/page.tsx`**:
   - Prefetch: `counterpartiesKeys.detail(id)` + compliance status
   - Render `CounterpartyDetail` inside `HydrationBoundary`
   - Show `ComplianceStatusBadge` prominently in the header

3. **Create `apps/app/src/features/counterparties/invite-vendor-button.tsx`** — "Send Upload Link" button:
   - On click: calls `POST /api/upload-tokens` (wired properly in VR-021)
   - For now: shows a toast "Upload link feature coming soon" (stub)

#### Acceptance Criteria
- [ ] Detail page loads without error
- [ ] Tabs switch between Overview / Documents / Timeline
- [ ] Compliance status badge visible in page header

---

## Sprint 4 — Documents Feature

Goal: staff can upload compliance documents to a counterparty, mark them verified, and see expiry dates.

---

### VR-014 · Documents Queries, Keys & Hooks

**Branch:** `feat/vr-014-documents-data-layer`

Depends on: VR-003, VR-007

#### Tasks

1. **Create `apps/app/src/features/documents/queries/documents.ts`**:
   - `getByCounterparty(supabase, counterpartyId)` — ordered by `created_at desc`
   - `create(supabase, payload)` — inserts document row (no file yet; storage path added separately)
   - `verify(supabase, id, verifiedBy)` — sets `verified=true`, `verified_at`, `verified_by`
   - `delete(supabase, id)` — soft approach: just removes row (Storage object stays for now)
   - `getExpiringSoon(supabase, orgId, withinDays)` — for dashboard

2. **`apps/app/src/queries/keys.ts`** — add:

   ```typescript
   export const documentsKeys = {
     all: () => ["documents"] as const,
     byCounterparty: (counterpartyId: string) => ["documents", counterpartyId] as const,
     expiringSoon: (orgId: string) => ["documents", "expiring", orgId] as const,
   }
   ```

3. **`apps/app/src/queries/index.ts`** — register `documents`.

4. **Create `apps/app/src/features/documents/hooks/use-documents.ts`**:
   - `useDocuments(counterpartyId)` — query
   - `useExpiringSoon(orgId)` — query
   - `useCreateDocument(counterpartyId, orgId)` — mutation
   - `useVerifyDocument(counterpartyId)` — mutation (invalidates `byCounterparty`)
   - `useDeleteDocument(counterpartyId)` — mutation

#### Acceptance Criteria
- [ ] TypeScript compiles
- [ ] Hooks are importable

---

### VR-015 · Documents Table in Counterparty Detail

**Branch:** `feat/vr-015-documents-table`

Depends on: VR-014, VR-013

#### Tasks

1. **Create `apps/app/src/features/documents/columns.tsx`**:
   - Document Type (badge: COI, W9, License, Other)
   - File Name
   - Expires At (color-coded: red if expired, amber if within 30 days, green otherwise)
   - Verified (checkmark badge + `verified_by` name on hover)
   - Uploaded At
   - Actions (verify, delete)

2. **Create `apps/app/src/features/documents/documents-table.tsx`** — uses `useDocuments(counterpartyId)`, renders `DataTable`.

3. **Wire Documents tab** in `apps/app/src/features/counterparties/counterparty-detail.tsx`:
   - Replace stub with `<DocumentsTable counterpartyId={id} />`
   - Add "Upload Document" button above table

4. **Update counterparty detail page** to prefetch documents:

   ```typescript
   await queryClient.prefetchQuery({
     // eslint-disable-next-line @tanstack/query/exhaustive-deps
     queryKey: documentsKeys.byCounterparty(counterparty_id),
     queryFn: () => api.documents.getByCounterparty(supabase, counterparty_id),
   })
   ```

#### Acceptance Criteria
- [ ] Documents tab renders (empty state if no docs)
- [ ] Expiry date colour coding works correctly

---

### VR-016 · Document Upload Modal (Staff)

**Branch:** `feat/vr-016-document-upload`

Depends on: VR-015

#### Tasks

1. **Create `apps/app/src/features/documents/upload-document-modal.tsx`**:

   Fields:
   - `document_type` (Select: COI, W9, License, Other)
   - `expires_at` (Date picker — use shadcn Calendar or native `<input type="date">`)
   - `file` (file input, accept: `.pdf,.jpg,.jpeg,.png`)

   Upload flow:
   ```
   1. User selects file + fills form
   2. On submit:
      a. Upload file to Supabase Storage:
         path = `{org_id}/{counterparty_id}/{uuid}/{sanitized_filename}`
         supabase.storage.from("documents").upload(path, file)
      b. On storage success: insert documents row with storage_path
      c. Invalidate documentsKeys.byCounterparty
      d. Toast success / error
   ```

2. **File size and MIME validation** on the client before upload:

   ```typescript
   const MAX_SIZE = 10 * 1024 * 1024 // 10MB
   const ALLOWED = ["application/pdf", "image/jpeg", "image/png"]
   ```

3. **`zod` schema** in `apps/app/src/features/documents/schemas.ts`:

   ```typescript
   export const uploadDocumentSchema = z.object({
     document_type: z.enum(["coi", "w9", "license", "other"]),
     expires_at: z.string().optional(),
   })
   ```

#### Acceptance Criteria
- [ ] File uploads to Storage and path is saved in DB
- [ ] File over 10MB shows error
- [ ] Wrong MIME type shows error
- [ ] Document appears in table after upload

---

### VR-017 · Verify Document Button

**Branch:** `feat/vr-017-verify-document`

Depends on: VR-016

#### Tasks

1. **Create `apps/app/src/features/documents/verify-document-button.tsx`**:
   - Shows "Verify" button when `document.verified = false`
   - Shows green checkmark + "Verified by [name] on [date]" when `true`
   - Confirm dialog: "Mark this document as verified?"
   - On confirm: calls `useVerifyDocument` mutation
   - After verify: compliance status badge on counterparty detail re-fetches

2. **Compliance status cache invalidation** — after verify mutation, also invalidate:

   ```typescript
   queryClient.invalidateQueries({ queryKey: counterpartiesKeys.compliance(counterpartyId) })
   queryClient.invalidateQueries({ queryKey: counterpartiesKeys.detail(counterpartyId) })
   ```

#### Acceptance Criteria
- [ ] Verify button updates document row in DB
- [ ] Compliance badge on counterparty detail re-evaluates after verification
- [ ] Cannot un-verify (button disabled once verified)

---

## Sprint 5 — Compliance Dashboard

Goal: org dashboard shows real compliance summary numbers and expiring documents list.

---

### VR-018 · Dashboard Stats Query

**Branch:** `feat/vr-018-dashboard-stats`

Depends on: VR-006, VR-010

#### Tasks

1. **Create `apps/app/src/features/compliance/queries/compliance.ts`**:

   ```typescript
   async getStats(supabase: Supabase, orgId: string) {
     const { data, error } = await supabase.rpc("get_compliance_stats", { _org_id: orgId })
     if (error) throw error
     return data as { total: number; ready: number; warning: number; blocked: number; pending: number }
   },

   async getExpiringSoon(supabase: Supabase, orgId: string, withinDays = 30) {
     const cutoff = new Date()
     cutoff.setDate(cutoff.getDate() + withinDays)
     const { data, error } = await supabase
       .from("documents")
       .select("*, counterparties(legal_name)")
       .eq("org_id", orgId)
       .lte("expires_at", cutoff.toISOString().split("T")[0])
       .gte("expires_at", new Date().toISOString().split("T")[0])
       .eq("verified", true)
       .order("expires_at", { ascending: true })
       .limit(10)
     if (error) throw error
     return data
   }
   ```

2. **`apps/app/src/queries/keys.ts`** — add:

   ```typescript
   export const complianceKeys = {
     stats: (orgId: string) => ["compliance", "stats", orgId] as const,
     expiringSoon: (orgId: string) => ["compliance", "expiring", orgId] as const,
   }
   ```

3. **`apps/app/src/queries/index.ts`** — register `compliance`.

4. **Create `apps/app/src/features/compliance/hooks/use-compliance.ts`**:
   - `useComplianceStats(orgId)`
   - `useExpiringSoon(orgId)`

---

### VR-019 · Compliance Stats Widget

**Branch:** `feat/vr-019-stats-widget`

Depends on: VR-018

#### Tasks

1. **Create `apps/app/src/features/compliance/compliance-stats.tsx`** — four stat cards:

   ```
   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
   │  READY   │  │  WARNING │  │  BLOCKED │  │  PENDING │
   │    42    │  │    5     │  │    2     │  │    8     │
   └──────────┘  └──────────┘  └──────────┘  └──────────┘
   ```

   Each card links to `/app/[org_id]/counterparties?status={value}`.

2. **Create `apps/app/src/features/compliance/compliance-stats-skeleton.tsx`** — skeleton version of 4 cards.

3. **Update `apps/app/src/app/app/[org_id]/page.tsx`** (org dashboard):
   - Prefetch `complianceKeys.stats(org_id)` and `complianceKeys.expiringSoon(org_id)`
   - Render `ComplianceStats` and `ExpiringSoonList`

---

### VR-020 · Expiring Soon List

**Branch:** `feat/vr-020-expiring-list`

Depends on: VR-019

#### Tasks

1. **Create `apps/app/src/features/compliance/expiring-soon-list.tsx`** — ordered list:
   - Each row: Document type badge, counterparty name (linked), expiry date, days remaining pill
   - Empty state: "No documents expiring in the next 30 days"
   - "View all" link to counterparties filtered by WARNING/BLOCKED

2. **Wire into org dashboard page** alongside stats widget.

#### Acceptance Criteria (S5 combined)
- [ ] Dashboard shows real counts from DB
- [ ] Clicking a stat card filters counterparties list
- [ ] Expiring list shows documents within 30 days
- [ ] Both have skeleton loading states

---

## Sprint 6 — Vendor Upload Portal

Goal: staff can generate a public link and vendors can upload their documents without logging in.

---

### VR-021 · Upload Token API Route

**Branch:** `feat/vr-021-upload-token-api`

Depends on: VR-004, VR-001

#### Tasks

1. **Create `apps/app/src/app/api/upload-tokens/route.ts`** — authenticated POST:

   ```typescript
   // POST /api/upload-tokens
   // Body: { counterparty_id: string }
   // Auth: must be org member with 'counterparties' edit permission
   export async function POST(request: Request) {
     const supabase = await createClient()
     const { data: { user } } = await supabase.auth.getUser()
     if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

     const { counterparty_id } = await request.json()

     // Verify counterparty belongs to user's org (RLS handles this)
     const { data: cp } = await supabase
       .from("counterparties")
       .select("id, org_id, legal_name")
       .eq("id", counterparty_id)
       .single()

     if (!cp) return Response.json({ error: "Not found" }, { status: 404 })

     const expires_at = new Date()
     expires_at.setDate(expires_at.getDate() + 7)

     const { data: token } = await supabase
       .from("upload_tokens")
       .insert({ counterparty_id, org_id: cp.org_id, expires_at, created_by: user.id })
       .select("token")
       .single()

     const uploadUrl = `${process.env.APP_URL}/upload?token=${token!.token}`
     return Response.json({ url: uploadUrl })
   }
   ```

2. **Update `apps/app/src/features/counterparties/invite-vendor-button.tsx`** — wire real API:
   - On click: calls `POST /api/upload-tokens`
   - On success: copies URL to clipboard + shows toast with the link

---

### VR-022 · Public Upload Page & Middleware Update

**Branch:** `feat/vr-022-upload-portal`

Depends on: VR-021

#### Tasks

1. **`apps/app/src/middleware.ts`** — add `/upload` to the public routes allow-list:

   ```typescript
   const PUBLIC_PATHS = ["/", "/auth", "/upload"]
   // or however the existing middleware checks paths
   ```

2. **Create `apps/app/src/app/upload/page.tsx`** — public Server Component:
   - Reads `?token=` from `searchParams`
   - If no token: renders error card "Invalid or expired upload link"
   - Calls `GET /api/upload/validate?token={token}` to verify (server-side fetch with service role)
   - If valid: renders `VendorUploadForm` client component with counterparty info

3. **Create `apps/app/src/app/upload/layout.tsx`** — minimal layout (no sidebar, no auth guard):

   ```typescript
   export default function UploadLayout({ children }) {
     return (
       <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
         <div className="w-full max-w-lg">{children}</div>
       </div>
     )
   }
   ```

4. **Create `apps/app/src/app/api/upload/validate/route.ts`** — GET:

   ```typescript
   // Validates token without consuming it. Returns counterparty info.
   export async function GET(request: Request) {
     const token = new URL(request.url).searchParams.get("token")
     const supabase = createServiceClient()
     const { data } = await supabase
       .from("upload_tokens")
       .select("*, counterparties(legal_name, org_id)")
       .eq("token", token!)
       .is("used_at", null)
       .gt("expires_at", new Date().toISOString())
       .single()

     if (!data) return Response.json({ valid: false }, { status: 404 })
     return Response.json({ valid: true, legal_name: data.counterparties?.legal_name })
   }
   ```

---

### VR-023 · Vendor Upload Form & Submission

**Branch:** `feat/vr-023-vendor-upload-form`

Depends on: VR-022, VR-016

#### Tasks

1. **Create `apps/app/src/features/vendor-portal/vendor-upload-form.tsx`** — client component:

   Fields:
   - `document_type` (Select: COI, W9, License)
   - `expires_at` (date input)
   - `file` (file picker)
   - Submit button

   On submit:
   ```
   POST /api/upload/{token}
   FormData: { file, document_type, expires_at }
   ```

2. **Create `apps/app/src/app/api/upload/[token]/route.ts`** — POST with service role:

   ```typescript
   export async function POST(request: Request, { params }) {
     const { token } = await params
     const supabase = createServiceClient()

     // 1. Validate token (must be unused and not expired)
     const { data: tokenRow } = await supabase
       .from("upload_tokens")
       .select("*, counterparties(org_id)")
       .eq("token", token)
       .is("used_at", null)
       .gt("expires_at", new Date().toISOString())
       .single()

     if (!tokenRow) return Response.json({ error: "Invalid token" }, { status: 403 })

     const formData = await request.formData()
     const file = formData.get("file") as File
     const document_type = formData.get("document_type") as string
     const expires_at = formData.get("expires_at") as string | null

     // 2. Validate file
     const docId = crypto.randomUUID()
     const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
     const path = `${tokenRow.counterparties!.org_id}/${tokenRow.counterparty_id}/${docId}/${safeName}`

     // 3. Upload to Storage
     const { error: storageError } = await supabase.storage
       .from("documents")
       .upload(path, file, { contentType: file.type })

     if (storageError) return Response.json({ error: storageError.message }, { status: 500 })

     // 4. Insert document row
     await supabase.from("documents").insert({
       id: docId,
       counterparty_id: tokenRow.counterparty_id,
       org_id: tokenRow.counterparties!.org_id,
       document_type,
       storage_path: path,
       file_name: file.name,
       file_size_bytes: file.size,
       mime_type: file.type,
       expires_at: expires_at || null,
       source: "upload",
     })

     // 5. Mark token as used
     await supabase.from("upload_tokens").update({ used_at: new Date().toISOString() }).eq("token", token)

     return Response.json({ success: true })
   }
   ```

3. **Confirmation screen** — after successful submit, show:
   - "Documents submitted successfully to [Company Name]"
   - "Your documents will be reviewed shortly"
   - No redirect needed

#### Acceptance Criteria (S6 combined)
- [ ] Staff can generate a unique upload link from counterparty detail
- [ ] Link opens `/upload` without requiring login
- [ ] Vendor can upload a PDF and it appears in the counterparty's documents tab
- [ ] Token is marked used after upload
- [ ] Expired or already-used tokens show error screen

---

## Sprint 7 — Engagements & Dispatch Approval

Goal: staff can create scheduled engagements and approve/block dispatch based on live compliance status.

---

### VR-024 · Engagements Data Layer

**Branch:** `feat/vr-024-engagements-data-layer`

Depends on: VR-004

#### Tasks

1. **Create `apps/app/src/features/engagements/queries/engagements.ts`**:
   - `getAll(supabase, orgId)` — join counterparties name
   - `getById(supabase, id)` — join counterparties + compliance status RPC
   - `create(supabase, payload)` — insert engagement
   - `approve(supabase, id, userId)` — update `approval_status='approved'`, `approved_at`, `approved_by`
   - `block(supabase, id, reason)` — update `approval_status='blocked'`, `blocked_reason`

2. **`apps/app/src/queries/keys.ts`** — add:

   ```typescript
   export const engagementsKeys = {
     all: () => ["engagements"] as const,
     list: (orgId: string) => ["engagements", orgId] as const,
     detail: (id: string) => ["engagement", id] as const,
   }
   ```

3. **Register in `apps/app/src/queries/index.ts`**.

4. **Create `apps/app/src/features/engagements/hooks/use-engagements.ts`**:
   - `useEngagements(orgId)`, `useEngagement(id)`, `useCreateEngagement(orgId)`, `useApproveEngagement(orgId)`, `useBlockEngagement(orgId)`

---

### VR-025 · Engagements List Page

**Branch:** `feat/vr-025-engagements-list`

Depends on: VR-024

#### Tasks

1. **Create `apps/app/src/features/engagements/columns.tsx`**:
   - Counterparty (linked to detail)
   - Property Name
   - Scheduled Date
   - Type
   - Approval Status (badge: Pending / Approved / Blocked)
   - Created By
   - Actions (view detail, quick approve if status=pending and compliance=ready)

2. **Create `apps/app/src/features/engagements/engagements-table.tsx`** — uses `useEngagements`.

3. **Update `apps/app/src/app/app/[org_id]/engagements/page.tsx`** — real RSC with prefetch + `HydrationBoundary`.

#### Acceptance Criteria
- [ ] Engagements list renders with real data
- [ ] Status badges colour-coded
- [ ] Skeleton during load

---

### VR-026 · Create Engagement Modal

**Branch:** `feat/vr-026-create-engagement`

Depends on: VR-025

#### Tasks

1. **Create `apps/app/src/features/engagements/create-engagement-modal.tsx`**:

   Fields:
   - `counterparty_id` (Combobox / searchable select from counterparties list — fetch via `useCounterparties`)
   - `property_name` (text)
   - `scheduled_date` (date picker)
   - `engagement_type` (select: Maintenance, Inspection, Installation, Other)
   - `notes` (textarea, optional)

   On submit: calls `useCreateEngagement`. After creation, if compliance status is `blocked`, show a warning inline: "This vendor is currently blocked. Dispatch will require manual approval."

2. **`apps/app/src/features/engagements/schemas.ts`**:

   ```typescript
   export const createEngagementSchema = z.object({
     counterparty_id: z.string().uuid("Select a counterparty"),
     property_name: z.string().min(1, "Property name is required"),
     scheduled_date: z.string().min(1, "Scheduled date is required"),
     engagement_type: z.enum(["maintenance", "inspection", "installation", "other"]),
     notes: z.string().optional(),
   })
   ```

---

### VR-027 · Dispatch Approval Card

**Branch:** `feat/vr-027-dispatch-approval`

Depends on: VR-026

#### Tasks

1. **Create `apps/app/src/features/engagements/dispatch-approval-card.tsx`** — shown on the engagement detail page:

   Layout:
   ```
   ┌──────────────────────────────────────┐
   │ [Vendor Name]              [BLOCKED] │
   │ ACME Contractors                     │
   │                                      │
   │ Property: 123 Main Street            │
   │ Scheduled: June 15, 2026             │
   │ Type: Maintenance                    │
   │                                      │
   │ Compliance Issues:                   │
   │  ✕ COI is missing                   │
   │  ✕ W9 expired on May 1, 2026        │
   │                                      │
   │  [Approve Anyway]  [Block Dispatch]  │
   └──────────────────────────────────────┘
   ```

   - If compliance = `ready` or `warning`: green "Approve Dispatch" button prominent, "Block" secondary
   - If compliance = `blocked`: red banner, "Approve Anyway" is destructive (requires confirmation dialog)
   - Approve action: calls `useApproveEngagement` → updates `approval_status`
   - Block action: shows textarea for `blocked_reason`, then calls `useBlockEngagement`

2. **Update `apps/app/src/app/app/[org_id]/engagements/[engagement_id]/page.tsx`** — render card with prefetched engagement + compliance data.

#### Acceptance Criteria (S7 combined)
- [ ] Engagements can be created with counterparty selection
- [ ] Dispatch card shows live compliance status
- [ ] Approve / Block buttons update DB and reflect in list
- [ ] Blocked dispatch requires confirmation when compliance is blocked

---

## Sprint 8 — Reminder Engine

Goal: expiry reminders are automatically scheduled and emailed to vendor contacts.

---

### VR-028 · Email Templates

**Branch:** `feat/vr-028-email-templates`

Depends on: VR-001

#### Tasks

1. **Create `apps/app/src/lib/email/templates/` directory**.

2. **Create `apps/app/src/lib/email/templates/upload-invite.ts`**:

   ```typescript
   export function uploadInviteEmail(data: { orgName: string; uploadUrl: string; vendorName: string }) {
     return {
       subject: `Action required: Upload compliance documents for ${data.orgName}`,
       html: `
         <p>Hi ${data.vendorName},</p>
         <p>${data.orgName} requires updated compliance documents from you.</p>
         <p><a href="${data.uploadUrl}">Click here to upload your documents</a></p>
         <p>This link expires in 7 days.</p>
       `,
     }
   }
   ```

3. **Create `apps/app/src/lib/email/templates/reminder-expiry.ts`**:

   ```typescript
   export function reminderExpiryEmail(data: {
     orgName: string; vendorName: string; documentType: string
     expiresAt: string; uploadUrl: string
   }) { ... }
   ```

4. **Create `apps/app/src/lib/email/templates/reminder-missing.ts`** — for missing required documents.

5. **Create `apps/app/src/lib/email/templates/engagement-blocked.ts`** — sent to the manager when dispatch is blocked.

6. **Extend `apps/app/src/lib/email/service.ts`** — add typed wrapper:

   ```typescript
   type EmailTemplate = "upload-invite" | "reminder-expiry" | "reminder-missing" | "engagement-blocked"

   export async function sendTransactionalEmail<T>(
     template: EmailTemplate,
     data: T,
     to: string
   ): Promise<Result<unknown, Error>>
   ```

#### Acceptance Criteria
- [ ] All 4 template functions are exported and typed
- [ ] `sendTransactionalEmail` can be called from a route handler
- [ ] Templates render valid HTML (manual test: call `sendEmail` in a test route)

---

### VR-029 · Reminder Scheduling DB Trigger

**Branch:** `db/vr-029-reminder-trigger`

Depends on: VR-004

#### Tasks

1. **Add to `supabase/schemas/reminders.sql`** — reminder scheduling trigger:

   ```sql
   create or replace function supajump.schedule_document_reminders()
   returns trigger language plpgsql security definer as $$
   begin
     -- Only schedule if expires_at is set
     if NEW.expires_at is not null then
       -- Remove any existing pending reminders for this document
       delete from public.reminders
        where document_id = NEW.id and status = 'pending';

       -- Insert reminders for 30, 14, and 7 days before expiry
       insert into public.reminders (org_id, counterparty_id, document_id, reminder_type, send_at)
       values
         (NEW.org_id, NEW.counterparty_id, NEW.id, 'expiry_30',
          (NEW.expires_at - interval '30 days')::timestamptz),
         (NEW.org_id, NEW.counterparty_id, NEW.id, 'expiry_14',
          (NEW.expires_at - interval '14 days')::timestamptz),
         (NEW.org_id, NEW.counterparty_id, NEW.id, 'expiry_7',
          (NEW.expires_at - interval '7 days')::timestamptz);

       -- Only insert future reminders (skip past ones)
       delete from public.reminders
        where document_id = NEW.id
          and status = 'pending'
          and send_at <= now();
     end if;

     return NEW;
   end;
   $$;

   create or replace trigger trg_schedule_document_reminders
     after insert or update of expires_at on public.documents
     for each row execute function supajump.schedule_document_reminders();
   ```

2. **Generate migration**:

   ```bash
   supabase stop
   supabase db diff --use-migra -f 012_reminder_trigger
   supabase start
   supabase migration up
   ```

#### Acceptance Criteria
- [ ] After inserting a document with `expires_at = today + 45 days`, three reminder rows appear in `reminders` table
- [ ] Reminders for dates already in the past are not inserted

---

### VR-030 · Edge Function: process-reminders

**Branch:** `feat/vr-030-process-reminders-fn`

Depends on: VR-028, VR-029

#### Tasks

1. **Create `supabase/functions/process-reminders/index.ts`**:

   ```typescript
   import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
   import { Resend } from "npm:resend"

   const supabase = createClient(
     Deno.env.get("SUPABASE_URL")!,
     Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
   )

   Deno.serve(async () => {
     const { data: dueReminders, error } = await supabase
       .from("reminders")
       .select(`
         *,
         counterparties ( legal_name, contact_email ),
         documents ( document_type, expires_at )
       `)
       .eq("status", "pending")
       .lte("send_at", new Date().toISOString())
       .limit(50) // process in batches

     if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })

     const resend = new Resend(Deno.env.get("RESEND_API_KEY"))

     for (const reminder of dueReminders ?? []) {
       try {
         const to = reminder.counterparties?.contact_email
         if (!to) {
           await supabase.from("reminders").update({ status: "failed", error_message: "no_contact_email" }).eq("id", reminder.id)
           continue
         }

         // Select template based on reminder_type
         const subject = reminder.reminder_type.startsWith("expiry")
           ? `Your ${reminder.documents?.document_type?.toUpperCase()} expires soon`
           : `Required document missing`

         await resend.emails.send({
           from: "WorkClear <noreply@workclear.io>",
           to,
           subject,
           html: `<p>Your compliance document expires on ${reminder.documents?.expires_at}. Please upload a renewed document.</p>`,
         })

         await supabase.from("reminders").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", reminder.id)
       } catch (err) {
         await supabase.from("reminders").update({ status: "failed", error_message: String(err) }).eq("id", reminder.id)
       }
     }

     return new Response(JSON.stringify({ processed: dueReminders?.length ?? 0 }))
   })
   ```

2. **`supabase/functions/process-reminders/deno.json`** (if needed for imports).

3. **Test locally**:

   ```bash
   supabase functions serve process-reminders
   curl -X POST http://localhost:54321/functions/v1/process-reminders \
     -H "Authorization: Bearer {anon_key}"
   ```

---

### VR-031 · Supabase Cron Job

**Branch:** `chore/vr-031-cron-config`

Depends on: VR-030

#### Tasks

1. **`supabase/config.toml`** — enable cron:

   ```toml
   [db.cron]
   enabled = true
   ```

2. **`supabase/schemas/cron_jobs.sql`** (new file) — define cron jobs using `pg_cron`:

   ```sql
   -- Process pending reminders every hour
   select cron.schedule(
     'process-reminders-hourly',
     '0 * * * *',
     $$
       select net.http_post(
         url := current_setting('app.supabase_url') || '/functions/v1/process-reminders',
         headers := jsonb_build_object(
           'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
           'Content-Type', 'application/json'
         )
       );
     $$
   );

   -- Scan for expiring documents daily at 08:00 UTC
   select cron.schedule(
     'scan-expiring-docs-daily',
     '0 8 * * *',
     $$
       -- This inserts any missing reminder rows for documents expiring in the next 30 days
       insert into public.reminders (org_id, counterparty_id, document_id, reminder_type, send_at)
       select d.org_id, d.counterparty_id, d.id,
              case
                when d.expires_at - current_date <= 7  then 'expiry_7'
                when d.expires_at - current_date <= 14 then 'expiry_14'
                else 'expiry_30'
              end,
              now()
       from public.documents d
       where d.expires_at between current_date and current_date + 30
         and d.verified = true
         and not exists (
           select 1 from public.reminders r
           where r.document_id = d.id and r.status in ('pending', 'sent')
         );
     $$
   );
   ```

3. **Generate migration**:

   ```bash
   supabase stop
   supabase db diff --use-migra -f 013_cron_jobs
   supabase start
   supabase migration up
   ```

#### Acceptance Criteria (S8 combined)
- [ ] Uploading a document with `expires_at` creates 3 reminder rows
- [ ] `process-reminders` Edge Function runs locally and marks reminders as `sent`
- [ ] Email is delivered (use Resend test domain in development)
- [ ] Cron jobs appear in Supabase cron dashboard

---

## Sprint 9 — Requirements Settings & Onboarding

Goal: companies can configure what documents they require, and new signups are guided through setup.

---

### VR-032 · Requirement Profiles Settings UI

**Branch:** `feat/vr-032-requirements-settings`

Depends on: VR-004, VR-005

#### Tasks

1. **Create `apps/app/src/features/requirements/queries/requirements.ts`**:
   - `getAll(supabase, orgId)`
   - `getDefault(supabase, orgId)` — `is_default=true`
   - `create(supabase, payload)`
   - `update(supabase, id, payload)`
   - `setDefault(supabase, orgId, id)` — update target + unset all others

2. **Register in `apps/app/src/queries/index.ts`**, add `requirementsKeys` to `keys.ts`.

3. **Create `apps/app/src/features/requirements/requirement-profile-form.tsx`**:

   The default profile form:
   - List of document types with toggles: COI, W9, License, Other
   - For each enabled type: "Required" checkbox + "Warn X days before expiry" number input (default 30)
   - "Save" button calls `useUpdateRequirementProfile`

   Rule JSON shape:
   ```json
   [
     { "document_type": "coi",     "required": true,  "warn_days_before_expiry": 30 },
     { "document_type": "w9",      "required": true,  "warn_days_before_expiry": 0  },
     { "document_type": "license", "required": false, "warn_days_before_expiry": 60 }
   ]
   ```

4. **Update `apps/app/src/app/app/[org_id]/settings/requirements/page.tsx`** — real RSC with prefetch + form.

#### Acceptance Criteria
- [ ] Requirements page shows current rules
- [ ] Saving updates the `rules_json` in DB
- [ ] After saving, compliance statuses re-evaluate (via `invalidateQueries`)

---

### VR-033 · Extended Onboarding Flow

**Branch:** `feat/vr-033-onboarding-extension`

Depends on: VR-032, VR-012

#### Tasks

1. **Refactor `apps/app/src/features/profile/onboarding-form.tsx`** from a flat form to a 3-step stepper:

   **Step 1 — Company** (existing):
   - Company name (was "Organization Name")
   - Workspace name (keep as internal team name)

   **Step 2 — Requirements**:
   - Heading: "What documents do you require from vendors?"
   - Checkboxes: COI, W9, License (multi-select)
   - On "Next": create org + team (existing RPC), then insert `requirement_profiles` default row
   - If user skips: still creates a default profile with no rules

   **Step 3 — First Vendor** (optional):
   - Heading: "Add your first vendor"
   - Single form: legal name + email
   - "Skip" button
   - On submit: inserts a counterparty row
   - Redirect to `/app/[org_id]/counterparties` if vendor was added, else `/app/[org_id]`

2. **Stepper UI** — use a simple step indicator component (can be built inline, no external dep):

   ```
   ① Company  ②  Requirements  ③  First Vendor
   ```

3. **State management** — use `useState` for step + form values. `react-hook-form` per step or a single form with `trigger()` for partial validation.

#### Acceptance Criteria
- [ ] New user completes 3-step onboarding
- [ ] Default requirement profile is created
- [ ] Skipping step 3 still lands on dashboard
- [ ] Existing users are not shown onboarding again (guarded by org existence check)

---

### VR-034 · Invitation Accept Page Fix

**Branch:** `fix/vr-034-invitation-accept`

Note: the existing codebase sends invitation emails but has no `/invitation` route. This PR fixes it.

#### Tasks

1. **Create `apps/app/src/app/invitation/page.tsx`** — reads `?token=` from URL:
   - Calls `accept_org_invite` RPC (or equivalent existing RPC — check `supabase/schemas/invitations.sql`)
   - On success: redirect to `/app`
   - On error: show error card with "This invitation has expired or already been used"

2. **Update invitation email** in `src/app/api/invitations/create/route.ts` — ensure the link points to `/invitation?token={token}` on `APP_URL`.

#### Acceptance Criteria
- [ ] Invited user can click email link and join org
- [ ] Already-used token shows error, not a blank page

---

## Sprint 10 — Hardening & Polish

Goal: production-ready MVP. Error states, empty states, audit trail, linting, and a final manual QA pass.

---

### VR-035 · Audit Log Write Helpers & Timeline UI

**Branch:** `feat/vr-035-audit-timeline`

Depends on: VR-004

#### Tasks

1. **Create `apps/app/src/lib/audit.ts`** — helper for server-side audit log inserts:

   ```typescript
   export async function logAuditEvent(supabase: SupabaseClient, payload: {
     org_id: string
     user_id?: string
     entity: string
     entity_id?: string
     event: string
     extra?: Record<string, unknown>
   }) {
     await supabase.from("audit_logs").insert({
       org_id: payload.org_id,
       user_id: payload.user_id,
       entity: payload.entity,
       entity_id: payload.entity_id,
       event: payload.event,
       payload: payload.extra ?? {},
     })
   }
   ```

2. **Wire `logAuditEvent`** into key mutations:
   - `POST /api/upload-tokens` → `counterparty.upload_link_sent`
   - `POST /api/upload/[token]` → `document.uploaded_by_vendor`
   - `useVerifyDocument` mutation → `document.verified`
   - `useApproveEngagement` → `engagement.approved`
   - `useBlockEngagement` → `engagement.blocked`

3. **Wire counterparty detail Timeline tab** — query `audit_logs` filtered by `entity_id = counterparty_id`:

   ```typescript
   const { data: timeline } = await supabase
     .from("audit_logs")
     .select("*")
     .eq("entity_id", counterpartyId)
     .order("created_at", { ascending: false })
     .limit(20)
   ```

---

### VR-036 · Empty States & Error Boundaries

**Branch:** `feat/vr-036-empty-states`

#### Tasks

1. **Create `apps/app/src/features/counterparties/counterparties-empty.tsx`**:
   - Shown when org has 0 counterparties
   - Illustration or icon + "No vendors yet" heading
   - "Add your first vendor" button (opens create modal)

2. **Create `apps/app/src/features/engagements/engagements-empty.tsx`**:
   - "No engagements scheduled" + "Schedule first engagement" button

3. **Add `error.tsx`** pages to key route segments:

   ```typescript
   // src/app/app/[org_id]/counterparties/error.tsx
   "use client"
   export default function Error({ error, reset }) {
     return (
       <div>
         <p>Something went wrong loading counterparties.</p>
         <button onClick={reset}>Try again</button>
       </div>
     )
   }
   ```

   Add to: `counterparties/`, `engagements/`, `upload/` route segments.

4. **Add `loading.tsx`** pages (these serve as Suspense fallback for full-page loads):

   ```typescript
   // src/app/app/[org_id]/counterparties/loading.tsx
   export default function Loading() {
     return <CounterpartiesTableSkeleton />
   }
   ```

---

### VR-037 · Performance & Security Hardening

**Branch:** `chore/vr-037-hardening`

#### Tasks

1. **Rate limiting on public upload API** (`/api/upload/[token]`):
   - Check `upload_tokens.used_at` is null before processing (already done in VR-023)
   - Add `X-RateLimit` headers or use Vercel's built-in rate limiting if available

2. **Storage signed URLs** — wherever the app returns a document URL, use signed URLs:

   ```typescript
   const { data } = supabase.storage.from("documents").createSignedUrl(storagePath, 3600) // 1 hour TTL
   ```

   Add `getSignedUrl(supabase, storagePath)` helper to documents queries.

3. **`pnpm lint` full pass** — fix any remaining ESLint warnings introduced during development.

4. **`pnpm build`** — resolve any TypeScript errors in production build mode.

5. **Review all `TODO` / `FIXME` comments** added during sprints.

---

### VR-038 · MVP Smoke Test Checklist

**Branch:** `chore/vr-038-smoke-test`

This is a documentation-only PR that records the manual QA checklist. No code changes.

Note: run this as the final PR after VR-041 so the checklist includes billing/limits and platform ops coverage.

Update `docs/QA-CHECKLIST.md` (skeleton already exists) and verify all items pass:

```markdown
# WorkClear MVP QA Checklist

## Onboarding
- [ ] New user can sign up and complete 3-step onboarding
- [ ] Default requirement profile is created
- [ ] Can add first vendor during onboarding

## Counterparties
- [ ] Can create a counterparty
- [ ] Counterparties list shows with search + status filter
- [ ] Status shows "Pending" when no documents are uploaded

## Documents (Staff Upload)
- [ ] Can upload a PDF document to a counterparty
- [ ] Document appears in counterparty detail Documents tab
- [ ] Can verify a document
- [ ] Status updates to "Ready" after all required docs are verified
- [ ] Status shows "Warning" when doc expiry is within 30 days
- [ ] Status shows "Blocked" when a required doc is missing or expired

## Vendor Upload Portal
- [ ] Staff can generate an upload link from counterparty detail
- [ ] Link opens /upload without login
- [ ] Vendor can upload a document
- [ ] Token is marked used after upload
- [ ] Expired token shows error

## Engagements
- [ ] Can create an engagement for a counterparty
- [ ] Dispatch card shows live compliance status
- [ ] Can approve engagement when counterparty is Ready
- [ ] Cannot approve blocked engagement without confirmation
- [ ] Block reason is recorded

## Reminders
- [ ] Uploading a document with expiry creates 3 reminder rows
- [ ] Running process-reminders Edge Function sends emails
- [ ] Reminder status updates to 'sent'

## Dashboard
- [ ] Stat cards show correct counts
- [ ] Expiring-soon list shows docs within 30 days

## Billing & Limits
- [ ] Tenant settings can show current subscription status/plan
- [ ] Tenant can open the Stripe billing portal to manage subscription
- [ ] Plan limits are enforced (cannot create beyond the configured counterparties limit)
- [ ] Limits page shows current usage vs limit

## Platform Admin (Super Admin)
- [ ] Super admin can access the `/admin` console
- [ ] `/admin` can view organization list and their billing status/plan
- [ ] `/admin` can open tenant Stripe billing portal (if supported in MVP)

## Multi-tenancy
- [ ] User from org A cannot see org B data
- [ ] Invitations work correctly

## Auth
- [ ] Login / logout / sign-up flows work
- [ ] Forgot password flow works
```

#### Acceptance Criteria (S12 combined)
- [ ] All audit events are logged for key actions
- [ ] Empty states render on all list pages when data is absent
- [ ] Error boundaries catch and display failures gracefully
- [ ] `pnpm lint` passes with 0 warnings
- [ ] `pnpm build` succeeds
- [ ] QA checklist passes manually

---

## Sprint 11 — Tenant Billing & Limits

Goal: tenants can view/manage their subscription and the system enforces plan limits server-side.

---

### VR-039 · Billing Portal UI + Subscription Status

**Branch:** `feat/vr-039-billing-portal`

#### Tasks

1. **Billing query layer**
   1. Create `apps/app/src/features/billing/queries/billing.ts`
   2. Add functions that call `public.get_organization_billing_status(lookup_org_id)`
   3. Add optional helpers to read `billing_products` / `billing_prices` for display (read-only)

2. **Billing settings page**
   1. Create `apps/app/src/app/app/[org_id]/settings/billing/page.tsx`
   2. Server-preload billing status via TanStack Query and `HydrationBoundary`
   3. Render:
      - current plan name (`plan_name`)
      - subscription status (`status`)
      - billing email (`billing_email`)
      - a `Manage billing` CTA

3. **Stripe billing portal integration**
   1. Update `apps/app/src/lib/stripe/server.ts` so `createStripePortal` accepts `orgId` (from route params), not `user.id`
   2. Wire the CTA to the updated server helper (via a server action or an internal route handler)

4. **Navigation wiring**
   1. Update settings navigation so:
      - `Billing` points to `/app/[org_id]/settings/billing`
      - `Limits` points to `/app/[org_id]/settings/limits`

#### Acceptance Criteria
- [ ] Billing settings page loads and displays current plan + subscription status
- [ ] Clicking `Manage billing` opens Stripe Customer Portal for the correct tenant org

---

### VR-040 · Plan Limits Enforcement (Counterparties Cap)

**Branch:** `db/vr-040-limits-counterparty-enforcement`

Depends on: VR-039 (for plan naming + display), but enforcement is implemented in the DB layer.

#### Tasks

1. **Deploy a limit function + trigger**
   1. Create `supabase/schemas/limits.sql`
   2. Implement:
      - `supajump.get_counterparty_limit_for_plan(plan_name text) returns integer | null`
         - map `Starter` → `50`
         - map `Growth` / `Pro` → `null` (unlimited) unless you define otherwise
      - `supajump.enforce_counterparty_limit()` trigger executed `BEFORE INSERT` on `public.counterparties`
         - fetch active subscription plan via `public.get_organization_billing_status(NEW.org_id)`
         - if plan is limited and current count >= limit → `raise exception`
         - handle “no billing data yet” by using a safe bootstrap default (document the chosen value)

2. **Register schema**
   1. Update `supabase/config.toml` `schema_paths` to include `./schemas/limits.sql`
   2. Generate migration and run `pnpm db:gen:types`

3. **Limits UI page**
   1. Create `apps/app/src/app/app/[org_id]/settings/limits/page.tsx`
   2. Show:
      - current limit (from billing plan)
      - current usage = `count(counterparties)`
      - upgrade CTA (link to billing portal)

4. **UX error handling**
   1. Update the create counterparty mutation to surface a friendly message when the trigger throws
      - example: “Starter plan limit reached (50 counterparties). Upgrade to add more.”

#### Acceptance Criteria
- [ ] On limited plans, the system rejects creating counterparties beyond the cap (DB enforcement)
- [ ] UI shows the cap and usage on `/settings/limits`

---

## Sprint 12 — Platform Ops (Super Admin)

Goal: provide a minimal platform admin console for org lifecycle + billing visibility.

---

### VR-041 · Super Admin Console Shell (`/admin`)

**Branch:** `feat/vr-041-super-admin-shell`

#### Tasks

1. **Route shell + authorization**
   1. Create `apps/app/src/app/admin/layout.tsx` and `apps/app/src/app/admin/page.tsx`
   2. Gate access to users who belong to a `organizations` row with `type = 'super'`
   3. Deny access with a clear UI error or redirect to `/auth/login`

2. **Organization list**
   1. Create a table that lists organizations with:
      - name, type, slug
      - billing status/plan via `public.get_organization_billing_status(org_id)`
      - member count (derived from `org_memberships`)
   2. Add basic filters:
      - plan_name, status

3. **Admin billing portal link (service-side)**
   1. Create `apps/app/src/app/api/admin/billing-portal/[org_id]/route.ts`
   2. Logic:
      - service-role fetch the org’s Stripe customer id from `billing_customers`
      - create a Stripe billing portal session and return the portal URL
      - enforce that only SUPER access can call this endpoint

4. **Org detail view (minimal)**
   1. Create `apps/app/src/app/admin/organizations/[org_id]/page.tsx`
   2. Show billing status + counters:
      - counterparties count
      - documents count (optional for MVP)

#### Acceptance Criteria
- [ ] Only super-admin users can open `/admin`
- [ ] `/admin` shows org list and their billing status/plan
- [ ] Super-admin can open a tenant’s Stripe billing portal from the console

---

## Appendix A — Git Tag / Release Strategy

| Tag | When | Contents |
|-----|------|---------|
| `v0.1.0-alpha` | After VR-013 | Counterparties CRUD + dashboard shell |
| `v0.1.0-beta` | After VR-023 | Documents + vendor upload portal |
| `v0.1.0-rc` | After VR-031 | Full reminder engine |
| `v0.1.0` | After VR-041 | MVP + launch ops: billing, limits, super admin shell + QA checklist passed |

---

## Appendix B — Key Commands Reference

```bash
# Start local development
supabase start
pnpm dev --filter @supajump/app

# Schema change workflow
supabase stop
supabase db diff --use-migra -f {migration_name}
supabase start
supabase migration up
pnpm db:gen:types

# Lint + build check
pnpm lint
pnpm build

# Test Edge Function locally
supabase functions serve process-reminders
curl -X POST http://localhost:54321/functions/v1/process-reminders \
  -H "Authorization: Bearer $(supabase status | grep 'anon key' | awk '{print $3}')"

# Deploy Edge Function
supabase functions deploy process-reminders

# Deploy migrations to production
supabase db push
```

---

## Appendix C — File Creation Summary

Files that do not exist today and will be created during this plan:

```
apps/app/src/
├── lib/
│   ├── supabase/service.ts                         VR-001
│   ├── audit.ts                                    VR-035
│   └── email/templates/
│       ├── upload-invite.ts                        VR-028
│       ├── reminder-expiry.ts                      VR-028
│       ├── reminder-missing.ts                     VR-028
│       └── engagement-blocked.ts                   VR-028
├── features/
│   ├── compliance/
│   │   ├── compliance-stats.tsx                    VR-019
│   │   ├── compliance-stats-skeleton.tsx           VR-019
│   │   ├── expiring-soon-list.tsx                  VR-020
│   │   ├── hooks/use-compliance.ts                 VR-018
│   │   └── queries/compliance.ts                   VR-018
│   ├── counterparties/
│   │   ├── columns.tsx                             VR-011
│   │   ├── compliance-status-badge.tsx             VR-011
│   │   ├── counterparties-table.tsx                VR-011
│   │   ├── counterparties-empty.tsx                VR-036
│   │   ├── counterparty-detail.tsx                 VR-013
│   │   ├── create-counterparty-modal.tsx           VR-012
│   │   ├── invite-vendor-button.tsx                VR-013 / VR-021
│   │   ├── schemas.ts                              VR-012
│   │   ├── hooks/use-counterparties.ts             VR-010
│   │   └── queries/counterparties.ts               VR-010
│   ├── documents/
│   │   ├── columns.tsx                             VR-015
│   │   ├── documents-table.tsx                     VR-015
│   │   ├── upload-document-modal.tsx               VR-016
│   │   ├── verify-document-button.tsx              VR-017
│   │   ├── schemas.ts                              VR-016
│   │   ├── hooks/use-documents.ts                  VR-014
│   │   └── queries/documents.ts                    VR-014
│   ├── engagements/
│   │   ├── columns.tsx                             VR-025
│   │   ├── engagements-table.tsx                   VR-025
│   │   ├── engagements-empty.tsx                   VR-036
│   │   ├── create-engagement-modal.tsx             VR-026
│   │   ├── dispatch-approval-card.tsx              VR-027
│   │   ├── schemas.ts                              VR-026
│   │   ├── hooks/use-engagements.ts                VR-024
│   │   └── queries/engagements.ts                  VR-024
│   ├── requirements/
│   │   ├── requirement-profile-form.tsx            VR-032
│   │   ├── hooks/use-requirement-profiles.ts       VR-032
│   │   └── queries/requirements.ts                 VR-032
│   ├── billing/
│   │   ├── billing-status-card.tsx                VR-039
│   │   ├── billing-portal-button.tsx             VR-039
│   │   ├── hooks/use-billing-status.ts          VR-039
│   │   └── queries/billing.ts                   VR-039
│   └── vendor-portal/
│       └── vendor-upload-form.tsx                  VR-023
├── app/
│   ├── app/[org_id]/
│   │   ├── counterparties/
│   │   │   ├── layout.tsx                          VR-009
│   │   │   ├── page.tsx                            VR-008 → VR-011
│   │   │   ├── loading.tsx                         VR-036
│   │   │   ├── error.tsx                           VR-036
│   │   │   └── [counterparty_id]/page.tsx          VR-008 → VR-013
│   │   ├── engagements/
│   │   │   ├── page.tsx                            VR-008 → VR-025
│   │   │   ├── loading.tsx                         VR-036
│   │   │   ├── error.tsx                           VR-036
│   │   │   └── [engagement_id]/page.tsx            VR-008 → VR-027
│   │   ├── settings/billing/page.tsx              VR-039
│   │   ├── settings/limits/page.tsx               VR-040
│   │   └── settings/requirements/page.tsx        VR-008 → VR-032
│   ├── invitation/page.tsx                         VR-034
│   └── upload/
│       ├── layout.tsx                              VR-022
│       ├── page.tsx                                VR-022
│       └── error.tsx                               VR-036
└── api/
    ├── admin/
    │   └── billing-portal/[org_id]/route.ts        VR-041
    ├── upload-tokens/route.ts                      VR-021
    └── upload/
        ├── validate/route.ts                       VR-022
        └── [token]/route.ts                        VR-023

supabase/
├── schemas/
│   ├── counterparties.sql                          VR-003
│   ├── documents.sql                               VR-003
│   ├── requirement_profiles.sql                    VR-004
│   ├── engagements.sql                             VR-004
│   ├── reminders.sql                               VR-004 / VR-029
│   ├── upload_tokens.sql                           VR-004
│   ├── audit_logs.sql                              VR-004
│   ├── limits.sql                                  VR-040
│   ├── storage_policies.sql                        VR-007
│   └── cron_jobs.sql                               VR-031
├── functions/
│   └── process-reminders/index.ts                  VR-030
└── migrations/
    ├── 00800_counterparties_and_documents.sql       VR-003
    ├── 00900_secondary_schemas.sql                  VR-004
    ├── 01000_rbac_workclear_permissions.sql       VR-005
    ├── 01100_compliance_engine.sql                  VR-006
    ├── 01200_reminder_trigger.sql                   VR-029
    ├── 01300_cron_jobs.sql                          VR-031
    └── 01400_limits_counterparty_enforcement.sql  VR-040

docs/
├── ARCHITECTURE.md                                  ✓ done
├── IMPLEMENTATION-PLAN.md                           ✓ done
├── PRODUCT.md                                       ✓ done
├── DEVELOPMENT.md                                   ✓ done
├── DECISIONS.md                                     ✓ done
├── DOMAIN-GLOSSARY.md                               ✓ done
├── RBAC.md                                          ✓ done
├── BILLING-SETUP.md                                 ✓ done
├── AGENT-WORKFLOW.md                                ✓ done
└── QA-CHECKLIST.md                                  ✓ done (fill at release)
```
