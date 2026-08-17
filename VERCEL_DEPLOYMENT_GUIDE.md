# Deploying to Vercel — Step-by-Step Guide

This is the operational runbook for actually deploying this app to Vercel,
now that the code changes it depends on exist. It assumes:

- `docs/architecture/ADR-002-github-api-storage-for-vercel.md` — the
  decision to add a GitHub-API-backed storage adapter, since Vercel has
  no persistent disk or guaranteed `git` binary.
- `VERCEL_IMPLEMENTATION_PLAN.md` — all 7 code phases in that plan are
  implemented and committed (`JOURNAL_STORAGE_BACKEND`, the GitHub API
  client and repository adapters, `TRUSTED_PROXY`, `PRODUCTION_ORIGIN`,
  the raw-HTML fix, `error.tsx`). See `VERCEL_MIGRATION_LOG.md` for the
  current status of that work — check it before deploying if you're not
  sure everything landed.
- `VERCEL_DEPLOYMENT_REVIEW.md`'s original "not suitable for Vercel"
  verdict is what ADR-002 exists to resolve — that verdict is now
  historical, not current.
- The security hardening in `SECURITY_HARDENING_CHECKLIST.md` is
  already done (it predates and is independent of the Vercel-specific
  work here). This guide doesn't repeat those items — it cross-references
  the ones still relevant at deploy time.

Researched directly against Vercel's current documentation as of
2026-08-17 (linked throughout, and listed again at the bottom) rather
than assumed — a couple of things worth flagging up front because they
correct outdated assumptions elsewhere in this repo:

- **Vercel Function default timeout is now 300 seconds** (5 minutes) on
  every plan, including Hobby, with Fluid Compute enabled by default for
  new projects. `VERCEL_DEPLOYMENT_REVIEW.md` cited "Hobby ~10s" —
  that was accurate when written but is no longer current. This doesn't
  change any code decision here, just removes a risk that no longer
  applies. ([Vercel Functions Limits](https://vercel.com/docs/functions/limitations))
- **Vercel's edge sets `X-Forwarded-For` itself and overwrites whatever a
  client sends**, specifically to prevent IP spoofing — this is exactly
  why `TRUSTED_PROXY=vercel` (added in Phase 7) is safe to trust in
  `getClientIp()`. ([Request headers](https://vercel.com/docs/headers/request-headers))
- **Environment variable changes only take effect on the *next*
  deployment** — setting or changing one doesn't retroactively affect a
  deployment that's already running. ([Environment variables](https://vercel.com/docs/environment-variables))

---

## 0. Prerequisites

Have these ready before starting — every step below assumes they exist:

- [ ] **This app's own source repo is pushed to GitHub.** Vercel deploys
      from a connected Git repository, not a local folder upload, for
      the auto-deploy-on-push workflow this guide assumes.
- [ ] **Your private content repository already exists on GitHub**
      (e.g. `my-journal-content`), containing `journals/`, `attachments/`,
      and `templates/` at its root, on the `main` branch, with a clean
      working tree — see `docs/content-repository.md` for the structural
      contract. If you've been using the app locally with the filesystem
      backend and clicking "Backup to Git", this repo already exists and
      is already current.
- [ ] **A fine-grained GitHub PAT** for that content repo — create one
      now if you don't already have one scoped correctly (see Step 2).
- [ ] **A long, random `JOURNAL_AUTH_PASSWORD`** and **`SESSION_SECRET`**
      ready to paste in (generate with `openssl rand -base64 24` and
      `openssl rand -hex 32` respectively, or a password manager).
- [ ] **A TOTP secret**, generated locally with `npm run totp:generate`
      and already added to your authenticator app — you'll need working
      codes to log in once deployed.

---

## 1. Create the GitHub PAT for the content repository

If you don't already have one that meets this, or want a fresh one
scoped specifically for this deployment (recommended — see
`GO_LIVE_MANUAL_STEPS.md` item 1b):

1. Go to [github.com/settings/tokens?type=beta](https://github.com/settings/tokens?type=beta) (fine-grained tokens).
2. **Generate new token** → Repository access → **Only select
   repositories** → your content repo only (e.g. `my-journal-content`).
3. Permissions → **Contents: Read and write**. Nothing else — this token
   now also powers every journal/template read and write on the
   `github-api` backend, not just Backup/Restore, so it needs read
   access too (it already had write).
4. Set a real expiration and note it somewhere you'll actually see it
   again.
5. Generate and copy the token immediately — GitHub only shows it once.

---

## 2. Import the project into Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and click **New
   Project**, or **Add New… → Project** from your dashboard.
2. Select this app's GitHub repository from the list (authorize
   Vercel's GitHub App for it if this is the first project you're
   importing from this account/org).
3. Vercel auto-detects **Next.js** as the framework — leave Build
   Command (`next build`), Output Directory, and Install Command at
   their defaults. Root Directory should be `/` (this app lives at the
   repo root).
4. **Don't click Deploy yet** — go to the environment variables section
   on this same import screen (or **Environment Variables** in Project
   Settings if you've already created the project) and set the
   variables in the next step first, so the very first deployment
   already has everything it needs.

([Deploying Git Repositories with Vercel](https://vercel.com/docs/git), [Managing projects](https://vercel.com/docs/projects/managing-projects))

---

## 3. Set environment variables

Add these in **Project Settings → Environment Variables** (or on the
import screen). Scope every one of these to **Production** only — see
the callout after the table for why Preview deployments need separate
handling, not the same values.

| Variable | Value | Notes |
|---|---|---|
| `JOURNAL_STORAGE_BACKEND` | `github-api` | Selects the GitHub API adapter — see ADR-002. |
| `JOURNAL_CONTENT_GIT_REMOTE_URL` | `https://github.com/<you>/<your-content-repo>.git` | Same repo Backup/Restore already used, if you've used those locally. |
| `JOURNAL_CONTENT_GIT_TOKEN` | *(the PAT from Step 1)* | Mark **Sensitive** (the checkbox next to the value) — hides it from the dashboard UI after saving, same as a secret. |
| `JOURNAL_AUTH_PASSWORD` | *(your long random password)* | Mark **Sensitive**. |
| `SESSION_SECRET` | *(your random session-signing secret)* | Mark **Sensitive**. |
| `TOTP_SECRET` | *(from `npm run totp:generate`)* | Mark **Sensitive**. |
| `TRUSTED_PROXY` | `vercel` | Makes the login rate limiter trust `X-Forwarded-For`'s first hop — safe specifically because Vercel's edge sets this header itself and strips whatever a client sends. |

**Do not set `JOURNAL_CONTENT_ROOT`.** It's meaningless on the
`github-api` backend (there's no local disk to point it at) and is
simply never read in this mode.

**Leave `PRODUCTION_ORIGIN` unset for now.** Vercel's own domains
(`*.vercel.app` or a custom domain added directly in Vercel — see Step
7) already satisfy Next's default same-origin check for Server Actions
without it. Only set it if you later put another proxy or CDN (e.g.
Cloudflare) in front of Vercel itself — see
`SECURITY_HARDENING_CHECKLIST.md` item 14.

> **⚠️ About Preview deployments:** if you ever push a non-`main` branch
> or open a PR, Vercel will want to build a Preview deployment for it. If
> these same env vars are also scoped to **Preview**, that preview
> deployment reads and writes your *real* content repository — there's
> only one content repo, and both Production and Preview would point at
> it identically. For a single-operator app, the simplest safe choice is
> to **only scope these variables to Production**, so a Preview
> deployment fails closed (missing config) rather than silently mutating
> your real journal from a branch you were just experimenting with. If
> you want working previews later, that's a deliberate follow-up
> decision (e.g. a second, throwaway content repo for Preview), not a
> default to reach for now.

([Environment variables](https://vercel.com/docs/environment-variables), [How to add and manage environment variables on Vercel](https://vercel.com/kb/guide/how-to-add-vercel-environment-variables))

---

## 4. Deploy

Click **Deploy**. Vercel builds the app (`next build`, same command
you've already verified locally) and, on success, assigns it a
`https://<project-name>.vercel.app` URL with **automatic HTTPS** — no
certificate setup needed, Vercel provisions and renews it for you.

Two build-time warnings you'll see and can ignore — both pre-existing,
unrelated to this deployment:

- *"Next.js inferred your workspace root..."* — a multi-lockfile
  detection notice, cosmetic.
- *"The middleware file convention is deprecated. Please use proxy
  instead."* — `src/middleware.ts` still works; this is Next 16 nudging
  toward a rename that hasn't been done yet. Not a deploy blocker.

---

## 5. First-login smoke test

1. Open the deployed URL. You should be redirected to `/login`.
2. Log in with your password and a current TOTP code.
3. Confirm your existing journal entries appear on the home page — this
   is the real proof the GitHub API adapter is reading your content repo
   correctly, not just that the build succeeded.

If the page instead shows the new `error.tsx` boundary or a blank
journal list when you expected entries, check **Project → Deployments →
[latest] → Functions/Logs** in the Vercel dashboard first — every error
in this app logs server-side detail via `console.error` before showing a
generic message to the browser (session/auth errors, GitHub API errors,
config validation errors all follow this pattern already).

---

## 6. End-to-end write test

1. Create a throwaway test journal entry through the hosted UI.
2. Confirm a new commit appears on `github.com/<you>/<your-content-repo>`
   (commit message: `Create journal entry: <title>`).
3. Edit the entry; confirm a second commit (`Update journal entry: ...`)
   with the expected diff.
4. Delete it; confirm a removal commit (`Delete journal entry: <id>`).
   The commits themselves stay in history — that's Git working as
   intended, not something to clean up.

---

## 7. Confirm Backup/Restore are gone

On the `github-api` backend, "Backup to Git" and "Restore from Git"
should not appear on the home page at all (Phase 5) — every write is
already a commit, so there's nothing left for those buttons to do.
Confirm they're absent.

---

## 8. Verify HTTPS and cookie security

Matches `SECURITY_HARDENING_CHECKLIST.md`'s go-live verification list —
worth re-confirming specifically on this deployment:

1. Open browser DevTools → **Application** (Chrome) / **Storage**
   (Firefox) → **Cookies** → find `journal_session`.
2. Confirm `Secure` = true, `HttpOnly` = true, `SameSite` = `Lax`. If
   `Secure` is false, `isProductionRuntime()` isn't resolving to `true`
   at runtime — check that the deployment is actually a Production one
   (pushed to the Production Branch, or `vercel --prod`), not a Preview.
3. Deliberately submit a few wrong passwords and confirm the lockout
   message appears — this also exercises `TRUSTED_PROXY=vercel` end to
   end (a misconfigured value here would either fail to lock out a real
   attacker, or lock out unrelated visitors sharing Vercel's edge IP —
   neither should happen with `vercel` set correctly).

---

## 9. (Optional) Add a custom domain

1. **Project Settings → Domains → Add**, enter your domain.
2. Follow Vercel's DNS instructions (an `A`/`CNAME` record, depending on
   whether it's an apex domain or subdomain).
3. Vercel automatically provisions an SSL certificate via Let's Encrypt
   once DNS verification succeeds — typically within a few minutes, no
   manual certificate work. ([Setting up a custom domain](https://vercel.com/docs/domains/set-up-custom-domain), [Working with SSL Certificates](https://vercel.com/docs/domains/working-with-ssl))
4. Only set `PRODUCTION_ORIGIN` if you also put a separate proxy/CDN in
   front of this custom domain (not needed for the domain feature
   itself) — see the note in Step 3.

---

## 10. Still outstanding: manual go-live steps

These are unrelated to the Vercel-specific work in this guide and
already tracked elsewhere — do them if you haven't:

- `GO_LIVE_MANUAL_STEPS.md` items 1–4: rotate secrets, verify
  HTTPS/cookies (Step 8 above covers this against the live deployment),
  enable 2FA on your GitHub and Vercel accounts, make this app's source
  repo private.
- `SECURITY_HARDENING_CHECKLIST.md`'s **Go-live verification** section
  at the bottom, once everything above is done.

---

## Ongoing operations

**Deploying updates.** Once the GitHub repo is connected, pushing to the
Production Branch (usually `main`) automatically triggers a new
Production deployment — no manual redeploy step for routine code
changes.

**Changing an environment variable.** Edit it in **Project Settings →
Environment Variables**, then trigger a new deployment for it to take
effect — a change alone doesn't touch already-running deployments.
Either push a commit, click **Redeploy** on the latest deployment in the
dashboard, or run `vercel --prod` from the CLI. ([Environment variables](https://vercel.com/docs/environment-variables))

**Rotating the GitHub PAT.** Generate the replacement first (Step 1),
update `JOURNAL_CONTENT_GIT_TOKEN` in Vercel, redeploy, confirm a create/
edit works against the content repo, *then* revoke the old token on
GitHub — this order avoids a window with no working token.

**Monitoring.** Auth events (login success/failure/lockout) and every
caught error already log via `console.error` — view them under
**Project → Logs** (or a specific deployment's **Functions** tab) in the
Vercel dashboard. No separate logging setup is needed for this app's
current scope.

**Function duration.** Default is 300s per invocation on every plan
(Step 0's callout) — comfortably above what listing/reading journal
entries through the GitHub API needs at this app's current scale. If
your journal grows very large and page loads start approaching that
limit, that's the trigger for revisiting Phase 6 (caching), which was
deliberately deferred until there was a real, measured reason to build
it — not before.

---

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Deployment fails at build time | Run `npx tsc --noEmit`, `npx eslint .`, and `npx next build` locally first — Vercel runs the same build your machine does. |
| App loads but immediately shows the generic error page | Check **Logs** for the real error. Common causes: `JOURNAL_STORAGE_BACKEND=github-api` set without both Git vars (fails fast with a clear message — see `getStorageBackend()`), or `JOURNAL_CONTENT_GIT_REMOTE_URL` not in `https://github.com/<owner>/<repo>` form (`getGithubApiStorageConfig()` throws a specific error naming the problem). |
| Login always fails | Confirm `JOURNAL_AUTH_PASSWORD`/`SESSION_SECRET`/`TOTP_SECRET` are set on the **Production** environment specifically (not only Preview/Development), and that you redeployed after setting them. |
| Journal list is empty but you expect entries | Confirm `JOURNAL_CONTENT_GIT_REMOTE_URL` points at the repo that actually has your entries under `journals/`, and that the PAT has at least read access there. |
| A save/edit fails with a generic error after working before | Check Logs for `GitHubConflictError` — this means the same entry was edited from two places (e.g. this deployment and a local filesystem-backend copy) without syncing in between; the adapter retries once automatically, so seeing this in logs after a successful retry is informational, not a bug. |
| Backup/Restore buttons still visible | Confirm `JOURNAL_STORAGE_BACKEND` is exactly `github-api` (case-sensitive, no extra whitespace) on the environment you're viewing. |

---

## Sources consulted

Vercel documentation, fetched directly on 2026-08-17 rather than assumed
from general knowledge, since hosting-platform specifics shift over
time:

- [Deploying Git Repositories with Vercel](https://vercel.com/docs/git)
- [Managing projects](https://vercel.com/docs/projects/managing-projects)
- [Environment variables](https://vercel.com/docs/environment-variables)
- [How to add and manage environment variables on Vercel](https://vercel.com/kb/guide/how-to-add-vercel-environment-variables)
- [Request headers](https://vercel.com/docs/headers/request-headers)
- [Vercel Functions Limits](https://vercel.com/docs/functions/limitations)
- [Setting up a custom domain](https://vercel.com/docs/domains/set-up-custom-domain)
- [Working with SSL Certificates](https://vercel.com/docs/domains/working-with-ssl)

Re-check these before a future deployment if enough time has passed
that platform specifics (function limits, header behavior, dashboard
layout) may have changed again — this guide reflects what was true when
written, not a permanent guarantee.
