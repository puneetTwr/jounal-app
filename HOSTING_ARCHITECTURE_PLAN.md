# Hosting Architecture Plan (v2)

> **Superseded 2026-08-17.** The operator chose Vercel specifically, which
> rules out this plan's Option B premise (a persistent-disk host running
> the exact current filesystem+git-CLI architecture) — Vercel has neither.
> See `docs/architecture/ADR-002-github-api-storage-for-vercel.md` and
> `VERCEL_IMPLEMENTATION_PLAN.md` for the architecture and plan actually
> being implemented. Kept here as the record of the alternative that was
> evaluated and not taken, not as an active plan.

Supersedes the *phased rollout* framing of `IMPLEMENTATION_PLAN.md` — that
file's core decision (Option B: keep the local-first architecture, change
*where* it runs, not *how* it works, on Railway/Fly/Render) still stands and
is not revisited here. This plan does three things that file didn't:

1. Confirms what's actually still outstanding, now that the security
   hardening pass (`SECURITY_HARDENING_CHECKLIST.md`) has landed most of its
   🔴 code items.
2. Directly answers the question "should local and hosted behavior be
   split via `APP_ENV`?" — with a recommendation, not just an assumption.
3. Lays out the remaining work — Docker packaging, the last checklist
   items, and a handful of hosted-only correctness gaps this review found —
   as one ordered plan.

Read `IMPLEMENTATION_PLAN.md` and `VERCEL_DEPLOYMENT_REVIEW.md` first if you
haven't — this plan assumes their storage-architecture conclusion and
doesn't re-derive it.

---

## 1. Where things actually stand today

Verified against the current repo (`git log`, checklist checkboxes, and a
direct read of the code — not assumed from prior docs):

**Done** (`SECURITY_HARDENING_CHECKLIST.md` items 1, 2, 3, 4, 9, 10, 11, 13):
path-traversal-safe id validation, `assertAuthenticated()` in every Server
Action, login rate limiting, signed/expiring session cookies, TOTP second
factor, security headers, open-redirect fix, auth event logging.

**Not done, and not code** (items 5, 6, 7, 8 — `GO_LIVE_MANUAL_STEPS.md`):
rotate the password + PAT, verify HTTPS/`Secure` cookies against a real
deployed host, enable 2FA on GitHub/hosting accounts, make the app's own
repo private. These stay manual, post-deploy steps — nothing below
duplicates them.

**Not done, and *is* code** (items 12, 14, 15, 16 — carried into this plan):
raw-HTML rendering in journal content (`rehype-raw` via
`@uiw/react-markdown-preview`), no pinned Server Actions origin allowlist,
the proposed entrypoint's naive `git clone` (would fail or leak the token
into `.git/config`), re-confirming PAT scope at go-live (manual, listed for
completeness).

**Not started at all**: everything in `IMPLEMENTATION_PLAN.md` Phase 1 —
there is no `Dockerfile`, no `docker-compose.yml`, no `docker/entrypoint.sh`,
and `next.config.ts` doesn't set `output: "standalone"` yet. `docker/`
doesn't exist as a directory in the repo at all right now (not even the
"empty placeholder" `VERCEL_DEPLOYMENT_REVIEW.md` described). This is the
single biggest gap between "hardened" and "hostable."

**New findings from this review** (not in any prior doc):
- No `error.tsx` anywhere in `src/app` — confirms the "empty-volume crash"
  risk `IMPLEMENTATION_PLAN.md` flagged is real today: `src/app/page.tsx`
  calls `listJournals()` unconditionally with nothing to catch a thrown
  filesystem error, and there's no fallback UI at any level.
- `process.env.NODE_ENV === "production"` is inlined in two unrelated
  places (`next.config.ts` for HSTS, `authenticate.ts` for the cookie's
  `Secure` flag) instead of behind one shared helper — small today, but the
  exact "scattered environment checks" pattern the request asked to avoid,
  and it'll multiply as more environment-sensitive decisions get added.
- `getClientIp()` tries Fly's header, then the first `X-Forwarded-For` hop,
  then `X-Real-IP`, in a fixed fallback order, regardless of which platform
  is actually in front of it. That's an implicit guess dressed up as a
  priority list, not a configuration choice — see §2.
- No CI workflow and no test files exist anywhere in the repo. `tsc`,
  `eslint`, and `next build` are today's only checks, run manually.

---

## 2. Does this need an `APP_ENV=local` / `APP_ENV=production` split?

**No — not as a general pattern, and not for storage/Git.** Here's the
reasoning, not just the conclusion:

**What `APP_ENV` branching is actually for** is picking between two
*different implementations of the same capability* — e.g., "read journals
from the local disk" vs. "read journals from a hosted database/API." This
app doesn't have that problem. `VERCEL_DEPLOYMENT_REVIEW.md` already
evaluated exactly this fork (its "Option A") and rejected it: the chosen
hosting targets (Railway/Fly/Render) give the container a **real persistent
disk and a real `git` binary**, so `src/lib/filesystem`, `src/lib/git`, and
everything in `src/features/*/repository` run **identically** in both
places. Introducing an `APP_ENV` switch here would mean building and
maintaining a second storage implementation for zero behavioral gain — the
opposite of what was asked ("avoid duplicating business logic
unnecessarily"). If Vercel (or any platform without persistent disk) ever
becomes the actual target, *that's* the trigger for a real storage rewrite
(Option A) — not a routine hosting pass, and it'd deserve its own ADR per
`ADR-001`'s own terms, exactly as `VERCEL_DEPLOYMENT_REVIEW.md` already
said.

**What's actually different between local and hosted here** isn't
"business logic that needs a different implementation" — it's a handful of
independent, narrow decisions that each already have (or need) a *single*
piece of configuration, not a global mode switch:

| Concern | Varies by | Right shape |
|---|---|---|
| Cookie `Secure` flag, HSTS header | dev vs. production build | `NODE_ENV` (Node/Next's own standard signal) — already correct in principle, just needs to stop being inlined twice |
| Which header carries the real client IP | *which hosting platform*, not local-vs-hosted | Explicit config value, not environment-guessing |
| Server Actions' allowed origin | the production domain, once it exists | One env var, consumed once |
| Everything storage/Git-related | nothing | No change — one implementation, already environment-independent |

None of these need `if (APP_ENV === "production")` scattered through
services or components, and none need a second implementation of anything.
They need to live at the one seam where the decision is actually made —
which is exactly the "common interface, environment-specific adapter at the
boundary" shape requested, just applied to three small config points
instead of the whole storage layer:

```
                 isProductionRuntime()          ← src/lib/config, reads NODE_ENV once
                       │
             ┌─────────┴─────────┐
             ▼                   ▼
     secure:false (dev)    secure:true (prod)
     no HSTS header        HSTS header


                 resolveClientIp(TRUSTED_PROXY)  ← src/lib/config + getClientIp.ts
                       │
        ┌──────────────┼──────────────┬─────────────┐
        ▼              ▼              ▼              ▼
     "none"         "fly"         "railway"       "render"
   (local dev,    trust           trust            trust
    no proxy)   Fly-Client-IP   X-Forwarded-For   X-Real-IP
                                 first hop
```

**Recommendation: reject the `APP_ENV` proposal as a general pattern.**
Keep one codebase, one implementation, environment-*agnostic* business
logic — exactly the existing `JOURNAL_CONTENT_ROOT` / `GitBackupConfig`
precedent (a config module that reads env vars and either returns a typed
value or fails/degrades clearly; callers never branch on *why* the value is
what it is). Extend that same precedent to the three concerns above instead
of introducing a new, broader concept. This satisfies "obvious which
functionality is local-only vs. hosted" better than an `APP_ENV` flag would
— each concern's env var name says exactly what it's for
(`TRUSTED_PROXY`, `PRODUCTION_ORIGIN`), instead of a single opaque flag
whose effects are scattered whichever files happen to check it.

The one place a *genuinely* different artifact exists for hosting is
**infrastructure, not application code**: `docker/entrypoint.sh` only runs
inside the container, never locally. That's already the right boundary —
it lives outside `src/`, touches no business logic, and `pnpm dev` remains
completely untouched. No further separation is needed there.

---

## 3. Proposed changes

### 3a. Consolidate environment-conditional logic (small, do first)

**Current behavior** — `process.env.NODE_ENV === "production"` appears
inline in `next.config.ts` and `src/features/auth/actions/authenticate.ts`.
**Problem in hosted environment** — none yet, but it's the seed of exactly
the scattering pattern that's easy to regret once a third or fourth
environment-sensitive decision shows up (and §3b/3c add two more).
**Proposed architecture** — one `isProductionRuntime()` export from
`src/lib/config`, wrapping `process.env.NODE_ENV === "production"` in
exactly one place. Both existing call sites switch to it.
**Files** — `src/lib/config/runtimeConfig.ts` (new), `src/lib/config/index.ts`,
`next.config.ts`, `src/features/auth/actions/authenticate.ts`.
**Env/config changes** — none (still reads `NODE_ENV`, sets nothing new).
**Testing** — trivial unit test: returns `true`/`false` for a mocked
`NODE_ENV`. **Deployment validation** — none beyond what
`GO_LIVE_MANUAL_STEPS.md` item 2 already covers (confirm `Secure`/HSTS on
the real host).

### 3b. Make the trusted-proxy header explicit config, not guesswork

**Current behavior** — `getClientIp()` tries `Fly-Client-IP`, then
`X-Forwarded-For`'s first hop, then `X-Real-IP`, unconditionally, in that
order.
**Problem in hosted environment** — this is a correctness *and* security
gap the checklist already flagged (item 3's own text: "confirm which
header/position Railway/Fly/Render actually populate — don't blindly trust
the first `X-Forwarded-For` hop, which a client can spoof"). Whichever
platform is actually chosen, the app is currently trusting a header shape
by hopeful fallback rather than by verified configuration — if the deployed
platform doesn't populate the header the code assumes, rate limiting keys
on an attacker-supplied value, silently defeating item 3 entirely.
**Proposed architecture** — a `TRUSTED_PROXY` env var
(`"fly" | "railway" | "render" | "none"`, default `"none"`) plus a small
lookup table mapping each value to exactly one header/position to trust.
`"none"` (the local-dev default, and the fail-safe default if the var is
missing or misspelled) always resolves to `"unknown"`, same bucket as
today's no-header case — never silently falls through to trusting an
unverified header. This turns a guess into a decision made once, at
deploy time, by whoever actually knows which platform is in front of the
app.
**Files** — `src/lib/config/trustedProxyConfig.ts` (new),
`src/lib/config/index.ts`, `src/lib/auth/getClientIp.ts` (rewritten to
switch on the configured value instead of trying all three).
**Env/config changes** — add `TRUSTED_PROXY` to `.env.example` (optional,
defaults to `"none"`); set it explicitly in the hosting platform's
dashboard once chosen.
**Testing** — unit tests per platform value (mock headers, assert the
right one wins; assert `"none"`/unset/garbage all resolve to `"unknown"`).
**Deployment validation** — trigger a few failed logins from a known IP
against the real deployed host and confirm the lockout keys on that IP,
not on the platform's edge IP (which would indicate the wrong header is
being trusted).

### 3c. Pin the Server Actions allowed origin once a domain exists

**Current behavior** — no `experimental.serverActions.allowedOrigins` in
`next.config.ts`; Next infers same-origin from the request itself. Flagged
as checklist item 14, explicitly deferred there until "there's a real
production domain."
**Problem in hosted environment** — low severity today (Next's default
inference plus the app's own session check already cover this), but once a
custom domain or a proxy (Cloudflare, etc.) sits in front of the app, an
explicit allowlist is cheap insurance against Server Action origin
confusion.
**Proposed architecture** — a `PRODUCTION_ORIGIN` env var (e.g.
`https://journal.example.com`), read once in `next.config.ts` and passed
into `experimental.serverActions.allowedOrigins` **only when set**; unset
locally, so dev behavior is untouched.
**Files** — `next.config.ts`.
**Env/config changes** — add `PRODUCTION_ORIGIN` to `.env.example`
(optional; document that it's unnecessary until a stable domain exists).
**Testing** — none meaningful beyond `next build` succeeding with and
without the var set. **Deployment validation** — submit a Server Action
from the real hosted origin (should work) and confirm the config doesn't
need touching again after a Railway/Fly subdomain vs. custom-domain switch
(re-set the var, redeploy).

### 3d. Complete the Docker packaging (`IMPLEMENTATION_PLAN.md` Phase 1)

Still the single biggest gap. Nothing in this review changes the design
already written there — `output: "standalone"`, the multi-stage
`Dockerfile` (Debian slim + `git` installed explicitly), `.dockerignore`.
Two corrections to make while implementing it, both already flagged as
checklist items but not yet reflected in that file's Dockerfile/entrypoint
snippets:

- **Checklist item 15** — the entrypoint's first-boot `git clone` must
  authenticate the same way `pushToRemote()`/`fetchFromRemote()` already do
  (a short-lived `http.extraheader` passed as an env var to that one `git`
  invocation), not `git clone $URL` with the token embedded in the URL —
  that would write the token straight into the cloned repo's
  `.git/config` on disk, undoing the credential hygiene already built into
  `src/lib/git`. Reuse `src/lib/git/tokenAuthEnv.ts`'s approach rather than
  inventing a second one in shell.
- **New finding from §1** — add a top-level `error.tsx` (and ideally a
  narrower one for `src/app/page.tsx`'s data-loading boundary) so a thrown
  filesystem error — empty volume, wrong permissions, a `JOURNAL_CONTENT_ROOT`
  typo in the platform's env var dashboard — renders a clear, in-app message
  instead of a blank crash. This is a second, independent safety net *on
  top of* the entrypoint's `mkdir -p`, not a replacement for it: the
  entrypoint prevents the common case (empty volume) from ever reaching
  this code path at all; the error boundary catches whatever it doesn't
  (e.g. a volume mounted read-only, a path that exists but points
  somewhere unexpected).

**Files** — `next.config.ts`, `Dockerfile` (new), `docker/entrypoint.sh`
(new), `.dockerignore` (new), `docker-compose.yml` (new, optional, for local
parity), `src/app/error.tsx` (new).
**Env/config changes** — none beyond what's already documented; the
entrypoint reads the same four vars the app already reads.
**Testing** — `docker build` succeeds; `docker run` against a bind-mounted
empty directory boots cleanly and serves the home page (proves both the
entrypoint's `mkdir -p` and the new error boundary independently work);
`docker compose up` reproduces local dev against the real local content
folder.
**Deployment validation** — first real deploy: confirm the platform's build
picks up the `Dockerfile` correctly, confirm the volume mount path matches
`JOURNAL_CONTENT_ROOT`, confirm `git --version` succeeds inside a shell on
the running container.

### 3e. Stop rendering raw HTML in journal content (checklist item 12)

Unrelated to hosting mechanics, but real and still open. **Current
behavior** — `@uiw/react-markdown-preview` includes `rehype-raw`
unconditionally, so raw `<script>`/`<img onerror>`/etc. in a journal entry's
Markdown body renders live, in both the read view and the editor's live
preview. **Problem in hosted environment** — same risk exists locally, but
"single author, own machine" made it low-stakes before; once a `Restore
from Git` can pull entries from anywhere the private content repo has ever
been pushed from, or a second device that got compromised, this becomes a
real XSS vector against the one account that matters. **Proposed fix** —
pass `skipHtml` (or a `urlTransform`/`rehypePlugins` override that drops
`rehype-raw`) to both consumers. **Files** —
`src/features/journal/components/JournalContentView.tsx`,
`.../MarkdownEditor.tsx` (exact names per checklist item 12). **Testing** —
a targeted test entry containing a `<script>` tag and an `<img
src=x onerror=...>` renders as inert text, not live HTML, in both the
detail view and the editor's preview pane.

---

## 4. Full "could this behave differently hosted?" sweep

Everything the request asked to check, with a verdict. Anything not listed
below was checked and found not applicable to this app (e.g. no
WebSockets, no SSE, no queues/scheduled jobs, no OAuth, no CORS surface —
there are no API routes at all, only Server Actions).

| Area | Verdict |
|---|---|
| Filesystem access / local paths | **No change needed.** Already abstracted behind `src/lib/filesystem` + `JOURNAL_CONTENT_ROOT`; works identically given a real persistent volume (§2). |
| Local storage / temp files | None used by the app itself. Not applicable. |
| Hardcoded ports/hosts | None found (`grep` for `localhost`/`127.0.0.1`/`:3000` across `src/` returns nothing). Dev-only default port comes from `next dev`/`next start`, already platform-configurable via `PORT`. |
| Environment variables | Existing fail-fast pattern (`getJournalContentRoot`, `getAuthPassword`, etc.) is correct and should be the template for the three new vars in §3. |
| Authentication / sessions / cookies | Already hardened (§1). `Secure` flag correctly conditional on `NODE_ENV`; just needs consolidating (§3a). |
| CORS | No API routes exist; not applicable. Server Actions' origin story is §3c. |
| OAuth / callback URLs | Not applicable — single shared-password + TOTP auth, no OAuth anywhere. |
| WebSockets / SSE | None in the app. Not applicable. |
| Background jobs / queues / scheduled jobs | None exist (by design — Backup/Restore are manual, on-demand). Not applicable. |
| Database connections | No database. Not applicable. |
| External APIs | Only GitHub, via the `git` CLI over HTTPS with a PAT — already handles credentials correctly (§1); no hosted-specific change needed beyond the entrypoint fix (§3d). |
| Uploads/downloads | No upload/download feature exists yet (`attachments/` is a directory convention, no UI) — nothing to assess. |
| Caching | Next's default per-route caching; nothing custom. No content ever needs to be shared across users (single operator), so no cache-invalidation-across-instances risk. |
| Browser/server boundaries | Already clean — confirmed no env var is read from a `"use client"` file (`VERCEL_DEPLOYMENT_REVIEW.md`'s finding still holds; no `NEXT_PUBLIC_*` vars exist). |
| Node runtime assumptions | `git` binary availability is the one real assumption — addressed by installing it explicitly in the Docker image (§3d), already specified in `IMPLEMENTATION_PLAN.md`. |
| Docker/runtime behavior | The actual gap — §3d. |
| Networking / proxy behavior | The trusted-proxy-header gap — §3b. |
| HTTPS requirements | Platform-provided automatically (Railway/Fly/Render); app-side correctness (Secure cookie, HSTS) already conditional on `NODE_ENV`, just needs the consolidation in §3a and the manual verification in checklist item 6. |
| Logging | Auth events already log to stdout (checklist item 13); no further change — the hosting platform's log viewer is the intended consumer, per the checklist's own explicit scope decision. |
| Error handling | The missing `error.tsx` — §3d. |
| Graceful shutdown | `withGitLock()` is a plain in-process mutex (§1, already documented); a `SIGTERM` mid-push could in theory leave the lock "stuck" until process restart, which self-heals on the next deploy anyway. Not worth building explicit shutdown handling for a single-operator app — note it, don't fix it, unless a real stuck-lock incident is ever observed. |
| Health/readiness endpoints | **None exist.** Recommended, not required: a plain `src/app/api/health/route.ts` returning 200 (optionally checking `JOURNAL_CONTENT_ROOT` is readable) gives Railway/Fly/Render's built-in health check something better than "did the root page 200," which currently depends on `listJournals()` succeeding. Small, additive, safe to add in the same pass as §3d. |
| Frontend-to-backend communication | Entirely Server Actions/Server Components; no separate frontend deploy target, no change. |
| Server/client environment boundaries (Next-specific) | Confirmed clean (see "Browser/server boundaries" above). |

---

## 5. Testing strategy

**No test infrastructure exists today** (no CI workflow, no test runner
configured). Given the scope of this pass, recommend adding the minimum
that actually catches the failure modes above — not a general test-suite
buildout, which is separate work:

**Run in CI, before every deploy:**
- `tsc --noEmit`, `eslint`, `next build` (already the manual verification
  loop used throughout the security hardening pass — just needs
  automating in a GitHub Actions workflow instead of being run by hand
  each time).
- Unit tests for the new pure-config functions from §3: `isProductionRuntime()`,
  the `TRUSTED_PROXY` → header-name lookup, and the existing
  `isValidSessionToken`/rate-limiter logic (currently untested despite
  being the most security-sensitive code in the app) — these are all pure
  functions, cheap to test, and exactly the kind of logic where a silent
  regression (e.g. `TRUSTED_PROXY` typo defaulting somewhere unsafe instead
  of to `"none"`) would otherwise only surface in production.
- `docker build` (from §3d) as a CI job, so a broken Dockerfile is caught
  on every push, not discovered at deploy time.

**Only checkable against the real hosted instance (cannot be CI):**
- Checklist item 6 — actual `Secure`/HTTPS behavior (depends on the real
  platform's TLS termination).
- §3b's deployment validation — which header the real platform's edge
  actually populates.
- §3d's first-boot behavior against a real empty volume.
- Backup/Restore end-to-end against the real GitHub remote (Phase 4 of
  `IMPLEMENTATION_PLAN.md` already specifies this).
- The full go-live verification list at the bottom of
  `SECURITY_HARDENING_CHECKLIST.md` — unchanged by this plan, still the
  final gate before treating the hosted URL as the real journal.

---

## 6. Suggested order of work

1. §3a (consolidate `NODE_ENV` checks) — trivial, do first, unblocks
   nothing but removes the smell before adding two more config points.
2. §3e (raw HTML rendering) — independent of hosting, no reason to wait.
3. §3b + §3c (trusted proxy, allowed origin) — config-only, no
   infrastructure dependency, can land before Docker exists.
4. §3d (Docker packaging + error boundary + entrypoint auth fix) — the
   actual blocker for having anything to deploy.
5. Provision hosting, deploy (`IMPLEMENTATION_PLAN.md` Phases 2–4,
   unchanged by this plan).
6. `GO_LIVE_MANUAL_STEPS.md` items 1–4, in the order that file already
   recommends, plus the deployment-validation rows from §3b/§3d above.
7. Final pass: `SECURITY_HARDENING_CHECKLIST.md`'s "Go-live verification"
   section.
