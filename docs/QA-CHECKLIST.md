# WorkClear MVP QA Checklist

Manual smoke test before tagging `v0.1.0`. Run after VR-041 (billing + platform admin complete).

**Tester:** _______________  
**Date:** _______________  
**Environment:** [ ] Local [ ] Staging [ ] Production  
**Branch / commit:** _______________

---

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
- [ ] Link opens `/upload` without login
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
- [ ] Running `process-reminders` Edge Function sends emails
- [ ] Reminder status updates to `sent`

## Dashboard

- [ ] Stat cards show correct counts
- [ ] Expiring-soon list shows docs within 30 days

## Billing & Limits

- [ ] Tenant settings show current subscription status/plan
- [ ] Tenant owner can open Stripe billing portal to manage subscription
- [ ] Plan limits are enforced (cannot create beyond configured counterparty cap)
- [ ] Limits page shows current usage vs limit
- [ ] Friendly error when Starter limit (50) is reached

## Platform Admin (Super Admin)

- [ ] Super admin can access `/admin` console
- [ ] `/admin` shows org list with billing status/plan
- [ ] Super admin can open tenant Stripe billing portal
- [ ] Non-super-admin user is denied access to `/admin`

## Multi-tenancy

- [ ] User from org A cannot see org B data
- [ ] Invitations work correctly

## Auth

- [ ] Login / logout / sign-up flows work
- [ ] Forgot password flow works

## Hardening

- [ ] Audit events logged for key actions (upload, verify, approve, block)
- [ ] Empty states render on all list pages when data is absent
- [ ] Error boundaries catch and display failures gracefully
- [ ] `pnpm lint` passes with 0 warnings
- [ ] `pnpm build` succeeds

---

## Sign-off

| Role | Name | Date | Pass/Fail |
|------|------|------|-----------|
| Developer | | | |
| QA / Product | | | |

**Notes:**

---

## Related Documents

- [`IMPLEMENTATION-PLAN.md`](IMPLEMENTATION-PLAN.md) — VR-038 defines this checklist
- [`PRODUCT.md`](PRODUCT.md) — expected user journeys
