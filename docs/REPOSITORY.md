# WorkClear — Repository & Remotes

Canonical GitHub repository: **https://github.com/sagittaris/workclear**

---

## Git remotes

| Remote | URL | Purpose |
|--------|-----|---------|
| `origin` | `https://github.com/sagittaris/workclear.git` | Your WorkClear repo — push branches and open PRs here |
| `upstream` | `https://github.com/supajump/supajump.git` | Optional — Supajump starter template for occasional sync |

Verify:

```bash
git remote -v
```

Set `origin` if needed:

```bash
git remote set-url origin https://github.com/sagittaris/workclear.git
```

Add `upstream` (optional):

```bash
git remote add upstream https://github.com/supajump/supajump.git
```

---

## Where to open pull requests

Open PRs against **`sagittaris/workclear`** (`main`), not `supajump/supajump`.

That avoids org-level integrations (e.g. Vercel on the upstream repo) blocking merges while you develop locally.

---

## Vercel (disabled for now)

WorkClear is developed **locally** first. Production deploy to Vercel comes later.

This repo includes root `vercel.json` with `"git.deploymentEnabled": false` so connecting Vercel later does not auto-deploy every push/PR.

To avoid PR checks from Vercel on **workclear**:

1. GitHub → **Settings** → **Integrations** → **Installed GitHub Apps** → **Vercel** → remove **workclear** access, **or**
2. Vercel dashboard → disconnect the **workclear** project.

Local dev does not use Vercel:

```bash
pnpm dev --filter @supajump/app
```

---

## Repository visibility

To make **workclear** private (personal account):

**GitHub → sagittaris/workclear → Settings → General → Danger zone → Change repository visibility → Private**

You cannot change visibility on `supajump/supajump` unless you are an org admin.

---

## Syncing from upstream Supajump (optional)

```bash
git fetch upstream
git checkout main
git merge upstream/main
# resolve conflicts, then:
git push origin main
```

Only sync when you intentionally want Supajump starter updates.
