# WorkClear — Stripe Billing Setup

Operational guide for configuring Stripe before Sprint 11 (VR-039, VR-040).

Architecture reference: [`ARCHITECTURE.md` §14](ARCHITECTURE.md#14-billing--subscriptions)

---

## Overview

WorkClear reuses Supajump billing tables synced via webhooks:

| Table | Source |
|-------|--------|
| `billing_products` | Stripe products |
| `billing_prices` | Stripe prices |
| `billing_customers` | Created on org provisioning |
| `billing_subscriptions` | Stripe subscriptions |

Billing state is read via:

```sql
select public.get_organization_billing_status('org-uuid-here');
-- Returns: { id, status, billing_email, plan_name }
```

**Critical:** Stripe product **names** must exactly match plan names used in `limits.sql`: `Starter`, `Growth`, `Pro`.

---

## 1. Create Products in Stripe Dashboard

In [Stripe Dashboard → Products](https://dashboard.stripe.com/products) (test mode first):

| Product name | Billing | Target price | Counterparty limit |
|--------------|---------|--------------|-------------------|
| **Starter** | Recurring monthly | €49 | 50 |
| **Growth** | Recurring monthly | €149 | Unlimited |
| **Pro** | Recurring monthly | €299 | Unlimited |

**Name matching is required.** `get_organization_billing_status` joins `billing_products.name` → returned as `plan_name` → mapped in `supajump.get_counterparty_limit_for_plan()`.

Optional metadata on products (for your reference, not read by app in MVP):

```json
{ "counterparty_limit": "50" }
```

---

## 2. Configure Customer Portal

In [Stripe Dashboard → Settings → Billing → Customer portal](https://dashboard.stripe.com/settings/billing/portal):

- Enable subscription management (upgrade/downgrade/cancel)
- Show invoice history
- Allow payment method updates
- Link products: Starter, Growth, Pro

Return URL: `{APP_URL}/app/{org_id}/settings/billing`

---

## 3. Webhook Endpoint

### Production

URL: `https://app.workclear.io/api/webhooks/stripe`

### Local development

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copy the `whsec_…` signing secret to `STRIPE_WEBHOOK_SECRET` in `.env.local`.

### Events to subscribe

These are handled in `apps/app/src/app/api/webhooks/stripe/route.ts`:

| Event | Action |
|-------|--------|
| `product.created` | Upsert `billing_products` |
| `product.updated` | Upsert `billing_products` |
| `product.deleted` | Delete `billing_products` |
| `price.created` | Upsert `billing_prices` |
| `price.updated` | Upsert `billing_prices` |
| `price.deleted` | Delete `billing_prices` |
| `checkout.session.completed` | Sync subscription |
| `customer.subscription.created` | Sync subscription |
| `customer.subscription.updated` | Sync subscription |
| `customer.subscription.deleted` | Sync subscription |

---

## 4. Environment Variables

Add to `apps/app/.env.local`:

```env
STRIPE_SECRET_KEY=sk_test_xxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxx
```

For production, use live keys (`STRIPE_SECRET_KEY_LIVE` is also supported in `src/lib/stripe/config.ts`).

---

## 5. Verify Local Sync

After starting webhook forwarding and creating products:

```bash
# Check products synced
supabase db sql --local -c "select id, name, active from billing_products;"

# Check prices synced
supabase db sql --local -c "select id, billing_product_id, unit_amount, currency from billing_prices;"
```

Create a test subscription via Stripe Customer Portal or Checkout, then:

```sql
select public.get_organization_billing_status('your-org-uuid');
```

Expected: `{ "plan_name": "Starter", "status": "active", ... }`

---

## 6. Customer Creation Flow

On org provisioning (onboarding), the app calls `createOrRetrieveCustomer(org_id)` which inserts/updates `billing_customers` keyed by `org_id`.

**Known fix (VR-039):** `createStripePortal` in `src/lib/stripe/server.ts` currently uses `user.id` as org ID. Must be updated to accept `orgId` from route params.

---

## 7. Plan Limit Enforcement

After VR-040, inserting a counterparty on Starter plan with ≥50 existing rows fails:

```
ERROR: Counterparty limit reached for plan Starter (50 max)
```

Default for orgs without billing data: treated as Starter limit (50) per `limits.sql` safe default.

UI surfaces this in the create-counterparty mutation with a friendly message and link to Settings → Limits.

---

## 8. Super Admin Billing Portal

Platform admins open tenant billing via:

```
POST /api/admin/billing-portal/[org_id]
```

Requires SUPER_ADMIN membership. Uses service role to fetch `billing_customers.customer_id` and creates a Stripe portal session server-side.

---

## 9. Test Checklist

- [ ] Three products exist in Stripe with exact names: Starter, Growth, Pro
- [ ] Webhook receives events locally via `stripe listen`
- [ ] `billing_products` and `billing_prices` populated after product sync
- [ ] Test subscription creates row in `billing_subscriptions`
- [ ] `get_organization_billing_status` returns correct `plan_name`
- [ ] Tenant owner can open Customer Portal from Settings → Billing
- [ ] Starter plan blocks 51st counterparty insert
- [ ] Super admin can open tenant portal from `/admin`

---

## Related Documents

- [`DEVELOPMENT.md`](DEVELOPMENT.md) — local env setup
- [`PRODUCT.md`](PRODUCT.md) — plan pricing table
- [`IMPLEMENTATION-PLAN.md`](IMPLEMENTATION-PLAN.md) — VR-039, VR-040, VR-041
