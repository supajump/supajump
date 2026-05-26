# WorkClear — Architecture Decision Log

Lightweight record of significant decisions. Format: **context → decision → consequences**.

New entries are appended at the bottom with the next ADR number.

---

## ADR-001 · Build on Supajump, not from scratch

**Context:** Need multi-tenant auth, RBAC, billing backend, and UI shell quickly.

**Decision:** WorkClear is a product layer on the existing Supajump monorepo (`apps/app`, `supabase/schemas/`).

**Consequences:**
- Reuse `organizations`, RBAC, Stripe webhooks, email service, TanStack Query patterns
- Supajump demo features (posts, teams nav) are replaced incrementally
- Plugin registry CLI is not used for core product features

---

## ADR-002 · Org-scoped tenancy (no team_id on domain data)

**Context:** Supajump supports Organizations → Teams → Users. WorkClear customers map 1:1 to an organization.

**Decision:** All WorkClear domain tables (`counterparties`, `documents`, `engagements`, etc.) are scoped to `org_id` only. Routes live at `/app/[org_id]/…`. No `team_id` on domain data.

**Consequences:**
- Simpler RLS policies (`team_id = null` in `has_permission` calls)
- Supajump team routes remain for base shell but are not used for compliance features
- Permission checks use org-level RPC only

---

## ADR-003 · Computed compliance status (not stored as truth)

**Context:** Counterparty "compliance status" changes whenever documents are uploaded, verified, or expire.

**Decision:** Status is computed at read time via `supajump.compute_compliance_status()`. Never write status as a mutable field on `counterparties`.

**Consequences:**
- `compliance_snapshots` is optional cache only (24h TTL)
- Dashboard and dispatch card always reflect current document state
- No sync bugs between stored status and actual documents

---

## ADR-004 · Vendor access via expiring upload tokens (no vendor login)

**Context:** Vendors are external parties who upload COI/W9/license files occasionally.

**Decision:** Vendors access `/upload?token=…` via single-use, 7-day expiring tokens. No Supabase auth account for vendors.

**Consequences:**
- `upload_tokens` table with service-role-only access
- Middleware bypass for `/upload`
- Lower friction for vendors; no password management

---

## ADR-005 · Core features in src/features/, not src/plugins/

**Context:** Supajump has a plugin architecture (`docs/PLUGIN-ARCHITECTURE-DECISION.md`) designed for distributable add-ons.

**Decision:** WorkClear core product modules (counterparties, documents, billing, etc.) live in `src/features/` following the posts reference pattern. Plugins reserved for optional future integrations (OCR, PM sync).

**Consequences:**
- No plugin CLI dependency for MVP delivery
- Feature folders are first-class, not installed packages
- Plugin docs remain for future extensibility

---

## ADR-006 · Append-only documents

**Context:** Compliance audit requires knowing what was on file at any point in time.

**Decision:** Document rows are never overwritten. New uploads create new rows. Latest per `document_type` is selected at query time.

**Consequences:**
- Storage paths include doc ID for versioning
- Verification applies to specific document rows
- History is preserved for audit

---

## ADR-007 · Billing and platform admin are in MVP scope

**Context:** Initial planning deferred billing UI and `/admin` console to post-MVP without a formal product decision.

**Decision:** Tenant billing portal, plan limits, and super-admin console are required before `v0.1.0` (S11/S12, VR-039 → VR-041).

**Consequences:**
- Release tag `v0.1.0` comes after VR-041, not VR-038
- Stripe Customer Portal and counterparty cap trigger are launch blockers
- QA checklist includes billing and platform ops sections

---

## ADR-008 · Plan limits enforced in PostgreSQL triggers

**Context:** Starter plan caps counterparties at 50. UI-only checks can be bypassed.

**Decision:** `supajump.enforce_counterparty_limit()` runs `BEFORE INSERT` on `counterparties`. Mapping lives in `supabase/schemas/limits.sql`.

**Consequences:**
- API, direct SQL, and UI all hit the same enforcement
- Create-counterparty mutation must surface friendly error messages
- Plan names in Stripe must match SQL mapping (`Starter`, `Growth`, `Pro`)

---

## ADR-009 · Stripe webhooks as subscription source of truth

**Context:** Subscription state must stay in sync with Stripe.

**Decision:** Reuse existing `/api/webhooks/stripe` handler. App reads billing state via `get_organization_billing_status(org_id)` RPC — never independently stores subscription status.

**Consequences:**
- Stripe Dashboard product names must match entitlement mapping
- Local dev requires `stripe listen` for webhook forwarding
- `createStripePortal` must use `org_id`, not `user.id` (VR-039 fix)

---

## ADR-010 · Modular monolith (no microservices for MVP)

**Context:** Target scale is ~10 → ~1,000 customers.

**Decision:** Single Next.js app + single Supabase project. Edge Functions for reminders only. No separate services.

**Consequences:**
- Simpler deployment (Vercel + Supabase)
- OCR, AV scanning, PM integrations deferred to later phases
- Scaling plan documented in ARCHITECTURE §20

---

## ADR-011 · Event-first domain actions

**Context:** Audit trail and future automation (reminders, notifications) need reliable action logging.

**Decision:** Significant actions emit domain events (`document_uploaded`, `engagement_approved`, etc.) logged to `audit_logs` before response.

**Consequences:**
- `audit_logs` is append-only (no UPDATE/DELETE policies)
- Reminder triggers react to document insert/update events
- Foundation for future webhook/queue integrations

---

## Template for new decisions

```markdown
## ADR-NNN · Title

**Context:** Why was this decision needed?

**Decision:** What was decided?

**Consequences:** What follows from this choice?
```
