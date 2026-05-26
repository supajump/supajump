# WorkClear — Product Requirements (MVP)

Version: v0.1
Status: Approved for implementation

**Tagline:** Know a contractor is cleared before work starts.

---

## 1. Executive Summary

WorkClear is a lightweight compliance operations product for small and mid-sized property operators. It prevents uninsured or non-compliant external workers from being dispatched to properties.

WorkClear does **not** replace property management software. It sits on top of existing workflows and automates:

- Document collection from vendors and contractors
- Renewal reminders before certificates expire
- Compliance status visibility before dispatch
- Audit trail for insurance and licensing decisions

---

## 2. Problem

Property operators rely on external vendors (HVAC, plumbing, landscaping, cleaning, etc.) who must carry valid insurance, licenses, and tax documents. Today this is managed with:

- Email chains and shared drives
- Spreadsheets with stale expiry dates
- Manual checks at dispatch time
- No single source of truth for "is this vendor cleared?"

The cost of failure: uninsured work on site, liability exposure, and operational delays when someone discovers missing paperwork at the last minute.

---

## 3. Target Customer

**Primary:** Small to mid-sized property management companies and owner-operators managing multiple properties or a portfolio of units.

**Characteristics:**

- 10–500 units or properties under management
- 20–500 active vendor/contractor relationships
- No dedicated compliance team
- Uses existing PM tools (Buildium, AppFolio, spreadsheets, email) — WorkClear complements, not replaces

---

## 4. Personas

| Persona | Description | Access |
|---------|-------------|--------|
| **Owner** | Company principal or ops lead. Manages billing, invites staff, sets requirements. | Full org access + billing/limits settings |
| **Admin** | Office manager. Manages counterparties, documents, team members. | Org admin (no billing) |
| **Manager** | Property manager. Creates engagements, approves dispatch, manages vendors. | Counterparties, documents, engagements |
| **Staff** | Coordinator. Uploads documents, views vendor status. | View counterparties, upload documents |
| **Vendor / Contractor** | External party. Never logs in. | Public upload link only (expiring token) |
| **Platform Super Admin** | WorkClear internal ops. | `/admin` console |

---

## 5. Core User Journeys (MVP)

### 5.1 Tenant onboarding

1. Sign up → create organization
2. Select required document types (COI, W9, license, etc.)
3. Default requirement profile is seeded
4. Optionally add first counterparty
5. Land on compliance dashboard

### 5.2 Vendor registry

1. Staff creates a counterparty (legal name, contact, roles)
2. Counterparty appears in list with compliance status badge
3. Staff sends upload link to vendor OR uploads documents directly
4. Staff verifies uploaded documents
5. Status updates to Ready / Warning / Blocked / Pending

### 5.3 Vendor self-upload (no login)

1. Staff generates upload link from counterparty detail
2. Vendor opens `/upload?token=…` (no account required)
3. Vendor selects document type, uploads file, sets expiry
4. Document appears in counterparty record; token is consumed

### 5.4 Dispatch approval

1. Manager creates an engagement (property, counterparty, scheduled date)
2. System computes live compliance status for that counterparty
3. If **Ready** or **Warning** → manager can approve dispatch
4. If **Blocked** → approval is blocked with visible reason
5. Approval is logged in audit trail

### 5.5 Renewals

1. Document uploaded with expiry date
2. System schedules reminder emails (30 / 14 / 7 days before expiry)
3. Dashboard shows "expiring soon" list
4. Status degrades to Warning then Blocked as dates pass

### 5.6 Billing (tenant owner)

1. Owner opens Settings → Billing
2. Views current plan and subscription status
3. Opens Stripe Customer Portal to upgrade or manage payment
4. Settings → Limits shows counterparty usage vs plan cap

### 5.7 Platform ops (super admin)

1. Super admin opens `/admin`
2. Views all organizations with billing status
3. Opens tenant Stripe portal for support cases

---

## 6. MVP Scope

### In scope (v0.1.0)

| Area | Capability |
|------|------------|
| Multi-tenancy | Org-scoped data, RLS, invitations, RBAC |
| Counterparties | CRUD, search, status badge, detail view |
| Documents | Staff upload, verify, Supabase Storage |
| Vendor portal | Token-based public upload |
| Compliance | Computed status (pending/ready/warning/blocked) |
| Dashboard | Status counts, expiring-soon list |
| Engagements | Create, dispatch approval card |
| Reminders | Email reminders for expiring/missing docs |
| Requirements | Org-level requirement profiles |
| Onboarding | 3-step flow (org + requirements + first vendor) |
| Billing | Stripe subscription, tenant billing portal |
| Limits | Counterparty cap on Starter plan (DB enforced) |
| Platform admin | `/admin` org list + billing visibility |

### Out of scope (post-MVP)

| Area | Rationale |
|------|-----------|
| Vendor login / vendor portal accounts | Token upload is sufficient for MVP |
| OCR / auto-extraction | Manual verify first; automate later |
| PM software integrations | No migration required for customers |
| Mobile native apps | Responsive web is sufficient |
| Public REST API | Internal server actions only |
| OCR virus scanning | Add via Storage webhook later |
| Team-scoped compliance data | Org is the tenant boundary |
| Feature flags / impersonation | Platform admin shell only in MVP |

---

## 7. Compliance Status Model

| Status | User-facing meaning |
|--------|---------------------|
| **Pending** | No documents uploaded yet |
| **Ready** | All required docs present, verified, not near expiry |
| **Warning** | At least one doc expires within 30 days |
| **Blocked** | Required doc missing, unverified, or expired |

Status is **computed at read time** from documents + requirement profile — not stored as mutable truth on the counterparty row.

---

## 8. Subscription Plans (MVP)

| Plan | Price | Counterparties |
|------|-------|----------------|
| Starter | €49/mo | 50 (hard cap) |
| Growth | €149/mo | Unlimited |
| Pro | €299/mo | Unlimited |

Configured in Stripe; synced via webhooks. See [`BILLING-SETUP.md`](BILLING-SETUP.md).

---

## 9. Success Metrics (v0.1.0)

| Metric | Target |
|--------|--------|
| Time to first counterparty | < 5 minutes after signup |
| Vendor upload completion | > 80% of links used within 7 days |
| Dispatch blocked when non-compliant | 100% (system enforced) |
| Reminder delivery | > 95% sent without error |
| Tenant isolation | Zero cross-org data leaks |

---

## 10. Related Documents

| Document | Purpose |
|----------|---------|
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | Technical architecture |
| [`IMPLEMENTATION-PLAN.md`](IMPLEMENTATION-PLAN.md) | Sprint/PR breakdown (VR-001 → VR-041) |
| [`DOMAIN-GLOSSARY.md`](DOMAIN-GLOSSARY.md) | Term definitions |
| [`RBAC.md`](RBAC.md) | Permissions reference |
| [`DECISIONS.md`](DECISIONS.md) | Architecture decision log |
| [`QA-CHECKLIST.md`](QA-CHECKLIST.md) | Manual test checklist |
