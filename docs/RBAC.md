# WorkClear — RBAC & Permissions Reference

How authorization works for WorkClear. Enforcement is **dual-layer**: RLS in PostgreSQL + optional UI checks via RPC.

Architecture reference: [`ARCHITECTURE.md` §4](ARCHITECTURE.md#4-rbac-design)
Implementation: VR-005 in [`IMPLEMENTATION-PLAN.md`](IMPLEMENTATION-PLAN.md)

---

## Permission Model

Supajump RBAC uses **resource + action + scope**:

| Field | Values | Meaning |
|-------|--------|---------|
| `resource` | `counterparties`, `documents`, `engagements`, `requirement_profiles` | What is being accessed |
| `action` | `view`, `create`, `edit`, `delete` | What operation |
| `scope` | `all`, `own` | `all` = any row in org; `own` = rows where `owner_id = current user` |

Check in application code:

```typescript
const { data: canEdit } = await supabase.rpc("has_org_permission", {
  _org_id: orgId,
  _resource: "counterparties",
  _action: "edit",
})
```

RLS policies call `supajump.has_permission()` — the database enforces even if UI checks are skipped.

WorkClear domain tables pass `team_id = null` because data is org-scoped only.

---

## Tenant Roles

Roles are seeded per org via `supajump.permission_catalog` on org creation.

### Capability Matrix

| Capability | owner | admin | member (manager/staff) |
|------------|-------|-------|------------------------|
| Billing & limits settings | ✓ | ✗ | ✗ |
| Invite org members | ✓ | ✓ | ✗ |
| Manage roles | ✓ | ✓ | ✗ |
| View counterparties | ✓ | ✓ | ✓ |
| Create counterparties | ✓ | ✓ | ✓ |
| Edit counterparties | ✓ (all) | ✓ (all) | ✓ (own only) |
| Delete counterparties | ✓ | ✓ | ✗ |
| Upload documents | ✓ | ✓ | ✓ |
| Verify documents | ✓ | ✓ | ✗ |
| Create engagements | ✓ | ✓ | ✓ |
| Approve dispatch | ✓ | ✓ | ✗ |
| Edit requirement profiles | ✓ | ✓ | ✗ |
| View requirement profiles | ✓ | ✓ | ✓ |

**Note:** ARCHITECTURE.md uses `manager` and `staff` as product-facing names. VR-005 seeds permissions under the Supajump `member` role slug. Map product roles to Supajump roles during VR-005 implementation or add dedicated role slugs if needed.

### Billing Access (not in permission catalog)

Billing and limits pages are gated by **org ownership**, not RBAC resource permissions:

- Route: `/app/[org_id]/settings/billing`
- Route: `/app/[org_id]/settings/limits`
- Check: user is org owner (or explicit billing permission added later)

Only `owner` can open Stripe Customer Portal.

---

## Platform Roles

Platform roles are **not** tenant RBAC roles.

| Role | Implementation | MVP access |
|------|----------------|------------|
| `SUPER_ADMIN` | Member of org with `type = 'super'` | `/admin`, org list, billing visibility, admin billing portal API |
| `SUPPORT` | Future | Read-only org data, audit logs |

Tenant `admin` role ≠ platform super admin. A property manager with org `admin` role cannot access `/admin`.

---

## Permission Catalog (VR-005)

Seeded in `supabase/schemas/multi_tenant_rbac.sql`:

### counterparties

| Role | view | create | edit | delete |
|------|------|--------|------|--------|
| owner | all | all | all | all |
| admin | all | all | all | all |
| member | all | all | own | — |

### documents

| Role | view | create | edit | delete |
|------|------|--------|------|--------|
| owner | all | all | all | all |
| admin | all | all | all | — |
| member | all | all | — | — |

### engagements

| Role | view | create | edit | delete |
|------|------|--------|------|--------|
| owner | all | all | all | all |
| admin | all | all | all | — |
| member | all | all | — | — |

### requirement_profiles

| Role | view | create | edit | delete |
|------|------|--------|------|--------|
| owner | all | all | all | all |
| admin | all | all | all | — |
| member | all | — | — | — |

---

## RLS Policy Template

All WorkClear domain tables follow this pattern:

```sql
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
for delete to authenticated with check (
  supajump.has_permission('counterparties', 'delete', org_id, null, owner_id)
);
```

Replace `counterparties` with `documents`, `engagements`, or `requirement_profiles`.

### Special cases

| Table | RLS notes |
|-------|-----------|
| `upload_tokens` | RLS enabled, **no user policies** — service role only |
| `audit_logs` | Append-only — INSERT via server; no UPDATE/DELETE |
| `billing_customers` | No user policies — access via RPC only |
| `billing_subscriptions` | No user policies — access via RPC only |

---

## UI Permission Patterns

### Hide actions the user cannot perform

```typescript
const { data: canCreate } = await supabase.rpc("has_org_permission", {
  _org_id: orgId,
  _resource: "counterparties",
  _action: "create",
})

if (!canCreate) return null
return <CreateCounterpartyModal />
```

### Server Component prefetch

Permission checks can run in Server Components before rendering action buttons. Do not rely on UI hiding alone — RLS is the enforcement layer.

### Dispatch approval

Approving an engagement requires `engagements.edit` permission. The compliance status check is separate (computed status must be `ready` or `warning`).

---

## Vendor / Public Access

Vendors have **no RBAC identity**. Upload routes validate tokens server-side with the service role:

```
POST /api/upload/[token]  →  service role validates token  →  insert document
```

No `has_org_permission` check — token possession is the authorization.

---

## Related Documents

- [`DECISIONS.md`](DECISIONS.md) — ADR-002 (org-scoped), ADR-004 (vendor tokens)
- [`DOMAIN-GLOSSARY.md`](DOMAIN-GLOSSARY.md) — role and term definitions
- [`DEVELOPMENT.md`](DEVELOPMENT.md) — super admin local setup
