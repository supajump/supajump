# WorkClear — AI Agent Workflow

Guide for using AI coding agents (Cursor, Claude Code, etc.) with the implementation plan.

---

## Golden Rules

1. **One PR per agent session** — pick a single VR (e.g. VR-010) and finish it
2. **Paste only the relevant sprint section** — do not load all 2,659 lines of IMPLEMENTATION-PLAN
3. **Schema PRs require manual gate** — after any `db/*` branch, run `pnpm db:gen:types` and commit types before starting UI work that depends on them
4. **Follow existing patterns** — reference `src/features/posts/` for feature structure
5. **Run `pnpm lint` before finishing** — non-negotiable

---

## Session Template

Start each agent session with:

```
Implement VR-XXX from docs/IMPLEMENTATION-PLAN.md (Sprint N section only).

Context:
- Architecture: docs/ARCHITECTURE.md
- Domain terms: docs/DOMAIN-GLOSSARY.md
- Permissions: docs/RBAC.md (if touching auth/RLS)

Constraints:
- One PR on branch feat/vr-XXX-slug
- Match existing code conventions (no semicolons, double quotes)
- Do not implement unrelated VRs
```

---

## Dependency Order

Do not skip ahead. Key gates:

| Gate | Blocked until |
|------|---------------|
| Counterparty UI (VR-010+) | VR-003 schema + VR-005 permissions + types regenerated |
| Compliance dashboard (VR-018+) | VR-006 compliance function |
| Vendor upload (VR-021+) | VR-003 `upload_tokens` table + service role client (VR-001) |
| Reminders (VR-028+) | VR-004 `reminders` table + email templates |
| Billing UI (VR-039) | Stripe products configured per BILLING-SETUP.md |
| Limits enforcement (VR-040) | VR-039 billing UI (plan display); can implement DB trigger in parallel |
| Platform admin (VR-041) | Billing RPC working; super org seeded locally |
| QA checklist (VR-038) | VR-041 complete — run last |

---

## What to Reference by Task Type

| Task | Read first |
|------|------------|
| New database table | ARCHITECTURE §6, IMPLEMENTATION-PLAN VR-003/004 |
| RLS policies | RBAC.md, ARCHITECTURE §4 |
| New feature module | ARCHITECTURE §5, posts reference, DOMAIN-GLOSSARY.md |
| Public upload route | ARCHITECTURE §12, DEVELOPMENT.md (public routes) |
| Billing | BILLING-SETUP.md, ARCHITECTURE §14 |
| Platform admin | ARCHITECTURE §15, DEVELOPMENT.md (super admin setup) |
| Compliance status | ARCHITECTURE §8, DOMAIN-GLOSSARY.md |

---

## What Agents Should NOT Do

- Reimplement Supajump auth, RBAC, or Stripe webhooks
- Put core features in `src/plugins/` (see DECISIONS.md ADR-005)
- Store compliance status as mutable field on counterparties (ADR-003)
- Add `team_id` to WorkClear domain tables (ADR-002)
- Skip RLS on new tables
- Commit `.env.local` or secrets
- Create git commits unless explicitly asked

---

## Branch & PR Naming

```
feat/vr-010-counterparties-queries
db/vr-003-core-domain-schemas
chore/vr-038-smoke-test
```

Squash-merge to `main` with descriptive commit message.

---

## Post-Session Checklist

- [ ] Acceptance criteria from VR section are met
- [ ] `pnpm lint` passes
- [ ] `pnpm build` passes (or `pnpm --filter @supajump/app build`)
- [ ] If schema changed: `pnpm db:gen:types` run and types committed
- [ ] No unrelated files modified

---

## Recommended First Sessions

| Order | VR | Deliverable |
|-------|-----|-------------|
| 1 | VR-001 | Env config, service role client |
| 2 | VR-002 | WorkClear rebrand (layout, sidebar, landing) |
| 3 | VR-003 | Core domain schemas |
| 4 | VR-005 | RBAC permissions |
| 5 | VR-008 | Navigation (replace Posts with WorkClear nav) |

---

## Related Documents

| Document | Purpose |
|----------|---------|
| [`IMPLEMENTATION-PLAN.md`](IMPLEMENTATION-PLAN.md) | Full PR list |
| [`DEVELOPMENT.md`](DEVELOPMENT.md) | Local setup |
| [`DECISIONS.md`](DECISIONS.md) | Do-not-revisit decisions |
| [`QA-CHECKLIST.md`](QA-CHECKLIST.md) | Final manual test |
