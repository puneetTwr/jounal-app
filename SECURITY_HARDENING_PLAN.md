# Security Hardening Plan — Hosting the Journal App

Investigation only — no application code was changed. This file is the plan to implement later (for example in Claude Code), alongside `IMPLEMENTATION_PLAN.md`.

Goal: make the hosted app **private enough that only you can read, create, edit, and manage journals**, without turning this into an enterprise identity platform.

---

## Direct answer: can someone bypass the password today?

**Yes — there is a realistic authentication bypass in the current code, and it should be treated as a blocker for any public URL.**

Today, the password only protects **page navigations** (via `src/middleware.ts`). It does **not** protect the actual data operations.

Every journal and Git feature is a Next.js Server Action (`"use server"`). Next.js treats those as public HTTP POST endpoints. Official Next.js guidance is that middleware is only an optimistic UI gate, and **every Server Action must check authentication itself**. None of these do:

| Server Action | Auth check inside the action? |
|---|---|
| `authenticate` | N/A (this *is* the login action) |
| `listJournals` | No |
| `getJournal` | No |
| `createJournal` | No |
| `updateJournal` / `updateJournalContent` / `updateJournalMetadata` | No |
| `deleteJournal` | No |
| `listTemplatesAction` / `getTemplateAction` | No |
| `backupToGit` / `restoreFromGit` / `isGitBackupConfigured` | No |

Middleware then **explicitly allows unauthenticated requests** to `/login` (and `/auth-background.png`):

```10:12:src/middleware.ts
function isPublicPath(pathname: string): boolean {
    return pathname === LOGIN_PATH || pathname === "/auth-background.png";
}
```

Server Actions are invoked as POST requests to a URL plus a `Next-Action` identifier. If that POST is aimed at a public path such as `/login`, middleware lets it through, and the action still runs. Action identifiers live in the JavaScript served from `/_next/static/…`, which the middleware matcher also leaves public (that part is normal and required for the app to load).

**What that means in practice:** an unauthenticated caller who can reach the hosted URL does not need your password to try to list, read, create, edit, or delete journals, or to trigger Backup/Restore. Middleware would still block a normal browser visit to `/` or `/journal/[id]`, so this is easy to miss when testing by hand.

This is the same class of issue Next.js documents, and it is made worse by historical middleware bypass CVEs (for example CVE-2025-29927). This app is on Next.js 16.2.12, which should include those patches — **but the architectural gap remains: auth is only in middleware**.

**Do not put this app on the public internet until Server Actions (and the data layer they call) refuse unauthenticated callers.**

There is no evidence of a second, independent “magic URL that dumps all files” bug. The bypass above is sufficient on its own.

---

## How authentication and data access work today

```
Browser
  → middleware.ts  (cookie present? SHA-256(password) match? else redirect to /login)
  → Server Components / Server Actions
      → Service → Repository → Markdown files on disk (JOURNAL_CONTENT_ROOT)
      → Git CLI against that same directory (Backup / Restore)
```

- **One shared password** in `JOURNAL_AUTH_PASSWORD` (plaintext in env). No username, no accounts, no second factor.
- **Login** (`authenticate`): `password !== expectedPassword` (not constant-time). On success, sets cookie `journal_session`.
- **Session token** is `SHA-256(password)`, not a random session id. Every login produces the **same cookie value**. There is no expiry, no logout, no way to revoke a stolen cookie except changing the password.
- Cookie flags: `httpOnly`, `sameSite: "lax"`, `secure` only when `NODE_ENV === "production"`, no `maxAge` (browser-session cookie), no `__Host-` prefix.
- **No rate limiting, lockout, or failed-login logging.**
- **No security headers** (no CSP, HSTS, `X-Frame-Options` / `frame-ancestors`, `nosniff`, `Referrer-Policy`).
- **Git token** is handled carefully: passed only as a short-lived env var to `git` via `execFile` (not a shell), not written to `.git/config`, not prefixed `NEXT_PUBLIC_`. That part is sound.
- `.env*` is gitignored except `.env.example`. Good.

This was acceptable for a local-only tool. It is not acceptable as the only barrier on the public internet.

---

## Other weaknesses in the current implementation

These matter once the app is reachable from anywhere. Severity assumes a public URL.

### Auth and sessions

1. **Password-only, and the current password is known to be short/guessable** (already noted in `IMPLEMENTATION_PLAN.md`). Unlimited login attempts + a short password is not a theoretical risk.
2. **Non-constant-time password compare** (`!==` / `===`). Helps password-guessing when the secret is short.
3. **Session = hash of the password.** A stolen cookie is reusable from any browser until the password changes; it is also an unsalted SHA-256 of the password (offline guessing if the cookie leaks). All devices share one token.
4. **No logout, no idle timeout, no server-side revocation.**
5. **Open redirect after login.** `LoginForm` accepts any `nextPath` that `startsWith("/")`. Values such as `//evil.example` are protocol-relative URLs and can send a just-logged-in browser off-site. Phishing aid, not a direct data dump.

### Data layer (defense in depth)

6. **IDs used as file paths without an allowlist.** `getJournal` / `deleteJournal` / `getTemplateAction` pass `id` straight into `path.join(…, id + ".md")`. UUID is validated when *writing* a full entry, but **not** when reading or deleting by id. Combined with the Server Action bypass, that is a path-traversal risk for `.md` files outside `journals/` (and deletion of arbitrary `.md` files). Even after auth is fixed, ids should be validated so a logged-in session cannot walk the filesystem.
7. **`updateJournal` trusts a full `JournalEntry` object from the client.** Fine for a single user once auth is real; still validate on the server (already partly true via `validateJournalEntry`).

### XSS / CSRF / HTTP

8. **CSRF against cookie-authenticated POSTs is reasonably mitigated today** by `SameSite=Lax` plus Next.js Server Action Origin/Host checks. That does **not** stop a direct (non-browser) caller, and it does not replace an auth check inside the action.
9. **XSS.** Journal bodies are rendered with `@uiw/react-md-editor`’s Markdown preview. If raw HTML in Markdown is honored, a compromised Git remote (or a successful write via the bypass) can run script in your browser. The session cookie is `httpOnly` (cannot be read by JS), but XSS can still **act as you** (read/change/delete entries, fire Backup/Restore). There is no Content-Security-Policy to limit that.
10. **Clickjacking.** No `frame-ancestors` / `X-Frame-Options`. Lower severity with `SameSite=Lax`, still worth a one-line header.
11. **HTTPS is assumed, not enforced in the app.** `secure: production` only marks the cookie. The host must redirect HTTP → HTTPS. Without HTTPS, the password and session travel in cleartext.

### Git, backups, secrets

12. **Backup/Restore are unauthenticated Server Actions** (same bypass). An attacker cannot easily *point* the push at their own GitHub (remote URL comes from env), but they can read journals through `listJournals`/`getJournal` and exfiltrate that way, or smash the working tree via Restore/Delete.
13. **GitHub is the off-machine copy of your journal.** If that repo is public, or the PAT can read/write other repos, or the GitHub account has no 2FA, the app password is irrelevant.
14. **Password and PAT live as plaintext env vars.** Normal for this architecture, but a host dashboard leak or a debug log of `process.env` is full compromise. Git stderr is logged server-side (`console.error`); keep log sinks private.

### What is already in good shape

- No `NEXT_PUBLIC_` secrets; auth/Git config are server-only.
- Fail-fast if `JOURNAL_AUTH_PASSWORD` or `JOURNAL_CONTENT_ROOT` is missing (fail closed).
- User-facing Git/journal errors are generic; details stay in server logs.
- `execFile("git", args)` — no shell interpolation of user input into Git.
- Token not persisted in `.git/config`.
- New journal ids are `randomUUID()` on the server, not client-supplied.
- `.env*` not committed.

---

## Recommended architecture (simplest thing that is actually strong)

Do **not** add user accounts, OAuth, a database, or a separate API gateway. Keep one user, Markdown on disk, Git as backup.

Use **two gates**, both simple:

```
Internet
  → (Gate 1) Identity-aware proxy — Cloudflare Access, or equivalent
       only your email / passkey can even reach the app
  → HTTPS to the Next.js app
  → (Gate 2) App login — strong password + TOTP, rate-limited,
       real sessions, auth checked again inside every Server Action
  → Markdown files on a private volume
  → Backup/Restore to a *private* GitHub repo with a narrowly scoped PAT
```

**Why Gate 1 (Cloudflare Access / Tunnel) instead of “just a better password”?**
A public `*.up.railway.app` (or similar) URL will be scanned. Putting Cloudflare Access in front means random internet clients never talk to Next.js at all. Cloudflare Tunnel is even better: the origin does not need a public inbound port. This is configuration, not a rewrite, and it is the highest security per hour of work.

**Why still harden the app (Gate 2)?**
Proxies get misconfigured. Next.js has had middleware bypasses. Defense in depth is the whole point of “only I can access this.”

**If you want the absolute minimum vendor surface:** skip Cloudflare and do Gate 2 thoroughly, including TOTP. That is still far stronger than today’s password screen, but the app origin stays publicly reachable and will be brute-forced / probed. For a private journal, Gate 1 is worth it.

**Do not move journals into a database “for security.”** That does not fix auth, and it fights ADR-001. Encryption-at-rest on the volume is optional later; access control is the problem now.

**Do not deploy this architecture to Vercel** to solve security. Vercel still has no persistent disk / no guaranteed `git` at runtime (`VERCEL_DEPLOYMENT_REVIEW.md`). Vercel’s WAF does not replace the findings above. Stay on a single-instance host with a volume (Railway / Fly / Render), as in `IMPLEMENTATION_PLAN.md`.

---

## ⚠️ Functionality changes

These are required or strongly implied by the hardening below. None of them change how journals are stored (still Markdown files + Git).

**⚠️ FUNCTIONALITY CHANGE — Login is no longer “type the password and go.”**
After hardening, login is: password **and** a 6-digit authenticator code (TOTP), with lockout after repeated failures. You will enroll one authenticator app (or password manager TOTP) once. A forgotten TOTP secret means using a printed recovery code or resetting env vars on the host.

**⚠️ FUNCTIONALITY CHANGE — You may see a second login before the app (Cloudflare Access).**
If Gate 1 is enabled, opening the URL first asks Cloudflare to verify *you* (email one-time code or GitHub/Google). Then the existing journal login still appears. Slightly more friction; the journal origin is no longer a public anonymous HTTP endpoint.

**⚠️ FUNCTIONALITY CHANGE — Sessions become real sessions.**
The cookie will no longer be “SHA-256 of the password, valid until the browser is quit.” Expect an expiry (recommended: 7 days, sliding or fixed), a **Log out** control, and the ability to invalidate all sessions by rotating `SESSION_SECRET` or changing the password. Stolen cookies will stop working after expiry or logout, instead of forever.

**⚠️ FUNCTIONALITY CHANGE — Too many wrong passwords will lock login for a while.**
That is the point. If you typo repeatedly from a café IP, wait out the cooldown (or restart the single process / wait for the window to expire). There is no admin console.

**⚠️ FUNCTIONALITY CHANGE — After login, `?next=` will only allow in-app paths.**
Deep links such as `/journal/<id>` still work. Protocol-relative or external URLs will be ignored.

**⚠️ FUNCTIONALITY CHANGE — Backup/Restore stay in the UI but become authenticated operations.**
Same buttons, but they will refuse to run without a valid session (they should have all along). No change to GitHub itself, other than tightening the PAT and confirming the content repo is private.

---

## Controls, prioritized

### 🔴 Critical — do these before the app has a public URL

1. **Require a valid session inside every Server Action and data-path Server Component** (not only in middleware). Centralize `requireSession()` and call it first in every action listed above except `authenticate`. Fail closed (no cookie → generic error, no data). Middleware stays for UX redirects only.
2. **Validate `id` values as UUIDs** (and resolve paths so they cannot escape `journals/` / `templates/`) before any filesystem read/write/delete.
3. **Rate-limit and lock out `authenticate`** per IP (and preferably per process globally as a backstop). Example: 5 failures / 15 minutes → cooldown. In-memory is enough on a **single instance** (do not scale out). Do not reveal whether the password or TOTP was the part that failed.
4. **Constant-time compare** for password and TOTP (`crypto.timingSafeEqual` on equal-length buffers).
5. **Rotate to a long random password** (password manager; 20+ characters). Stop using the current short one before the host is public.
6. **Replace SHA-256(password) sessions** with a signed, random, time-limited session (`SESSION_SECRET` in env; `httpOnly`, `Secure`, `SameSite=Lax` or `Strict`, `Path=/`). Add logout.
7. **HTTPS in production** (Railway/Fly/Render terminate TLS). Cookie `secure: true` in production. Do not serve the app on plain HTTP.
8. **Second factor: TOTP in the app, or Cloudflare Access in front — at least one.** For a private journal on the internet, password-only is not enough even after (1)–(7). TOTP is a small code change; Cloudflare Access is a small ops change. Doing **both** is the “as private as reasonably possible” bar without going enterprise.
9. **GitHub: content repo private; account 2FA on; PAT fine-grained, that repo only, Contents read/write, expiry set.** Never a classic PAT with all-repo access. Never put the token in the remote URL.
10. **Keep Next.js patched.** Middleware is not your security boundary; it has been bypassed before.

### 🟠 Recommended — do these as part of the same hardening pass if possible

11. **Cloudflare Tunnel + Access** in front of Railway (or equivalent: Tailscale Serve if you are willing to install Tailscale on every device). Prefer Tunnel so the origin is not a public port. Restrict Access to your email only.
12. **Security headers** in `next.config.ts`: `Content-Security-Policy` (start strict, allow `'self'`; tighten as the Markdown editor allows), `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `frame-ancestors 'none'`, `X-Robots-Tag: noindex, nofollow`.
13. **Fix the `next` open redirect** — allow only relative paths that start with a single `/` and do not start with `//`.
14. **Log auth events server-side** (success, failure, lockout) with IP and timestamp — **never** the password, TOTP, cookie, or PAT. Glance at host logs after deploy.
15. **Disable or sanitize raw HTML** in Markdown preview (or add `rehype-sanitize`). You are the only author, but a bad Git restore should not become XSS.
16. **Store a password hash in env (Argon2id / scrypt), not the plaintext password**, plus a separate `SESSION_SECRET`. A leaked env dump then does not immediately equal the login password (TOTP secret still must stay private).
17. **`__Host-journal_session` cookie name** (requires `Secure`, `Path=/`, no Domain).
18. **Confirm host env vars are not echoed into client bundles or build logs.** No `NEXT_PUBLIC_` for secrets. Production-only where the platform allows.

### 🟢 Optional — useful, not required to go live

19. **Passkeys / WebAuthn** instead of or in addition to TOTP — excellent, more implementation work.
20. **Tailscale-only access** (no public URL at all). Strongest network story; not “any browser on any machine” unless that machine runs Tailscale.
21. **Idle timeout** (e.g. 30–60 minutes without activity) on top of absolute session expiry.
22. **Recovery codes** for TOTP (hashed at rest, shown once).
23. **WAF / bot fight** (Cloudflare proxy). Nice if Gate 1 is already Cloudflare.
24. **Alert on burst of 401s** (email/Telegram from host logs). Easy to skip at first.
25. **Volume encryption / disk encryption** on the host. Protects a stolen disk; does not protect a live, authenticated process.
26. **Audit log of which entry ids were read/written.** Heavy for a personal app.
27. **IP allowlist** if you have a stable home IP — brittle on mobile.
28. **Automatic Backup-to-Git on a schedule** — availability/backup, not access control.

---

## Step-by-step implementation plan

Follow this after (or interleaved with) the Docker/Railway work in `IMPLEMENTATION_PLAN.md`. **Do not generate a public URL that you actually use for real journals until Phase A is done.**

### Phase A — Close the bypass and brute-force hole (🔴)

1. Add `src/lib/auth/requireSession.ts` that reads the session cookie and throws/returns a generic unauthorized result if invalid. Use it at the top of **every** Server Action except `authenticate` (and any future logout action).
2. Also call it from data-loading pages (`src/app/page.tsx`, `src/app/journal/[id]/page.tsx`) so Server Components are not relying on middleware alone.
3. Add `assertSafeEntryId(id)` (UUID regex already exists in `src/lib/validation/validators.ts`) in repository `get`/`delete` (journals and templates) before `path.join`.
4. Rate-limit `authenticate` in-memory (single instance). Generic error string in all failure cases.
5. Switch password comparison to `timingSafeEqual`.
6. Implement signed sessions:
   - New env `SESSION_SECRET` (32+ random bytes).
   - Cookie payload: random session id + expiry; HMAC or encrypted cookie (`iron-session` / `jose`). Do **not** store `SHA-256(password)` in the cookie.
   - `logout` Server Action clears the cookie.
   - Changing the password or rotating `SESSION_SECRET` invalidates existing cookies.
7. Restrict `nextPath` to in-app relative paths.
8. Manually verify: unauthenticated POST of a Server Action to `/login` returns unauthorized and does **not** list or mutate journals. (Test only against your own instance.)

### Phase B — Second factor (🔴 at least one of B1 / B2)

**B1 — TOTP (in-app)**

9. Add `JOURNAL_TOTP_SECRET` (or generate-on-first-boot written to a host secret — generating in logs is a footgun; prefer setting the secret yourself).
10. Login form: password + 6-digit code. Verify with a small TOTP library. Replay window ±1 step. Rate-limit as in Phase A.
11. Document a one-time enrollment path (otpauth URL shown only when `JOURNAL_TOTP_ENROLL=true`, then turn that flag off).

**B2 — Cloudflare Access (perimeter)**

12. Put Cloudflare Access in front of the Railway URL, policy: your email only (OTP or IdP).
13. Prefer Cloudflare Tunnel so Railway’s public hostname is not the thing the internet hits.
14. Keep app login enabled anyway (Gate 2).

### Phase C — Headers, XSS, GitHub, secrets (🟠)

15. Add the security headers in `next.config.ts`.
16. Sanitize Markdown HTML in the preview path.
17. Recreate GitHub PAT: fine-grained, one private repo, short expiry; store only in the host’s secret env UI.
18. Confirm `my-journal-content` (or equivalent) is **private**. Enable GitHub 2FA on the account.
19. Optional but worth it: Argon2id hash in `JOURNAL_AUTH_PASSWORD_HASH` instead of plaintext password.
20. `X-Robots-Tag: noindex` so the login page is less likely to be indexed.

### Phase D — Go live checklist

21. Strong password + TOTP enrolled + Access policy tested from your phone **off** Wi‑Fi.
22. Confirm HTTP redirects to HTTPS; cookie has `Secure` + `HttpOnly`.
23. Confirm logs show failed logins without secrets.
24. Click Backup to Git once; confirm the PAT cannot see unrelated repos.
25. Only then treat the hosted URL as the live journal.

---

## Migration notes

- **Journal files do not change format.** No Markdown migration.
- **You will be logged out** of every browser when sessions are reimplemented — expected.
- **Local `pnpm dev`:** set the new env vars in `.env.local` (`SESSION_SECRET`, TOTP secret). Rate limiting still applies locally (easy to lock yourself; keep the threshold documented).
- **GitHub PAT:** mint a new one for production; do not reuse a PAT that ever sat in a chat log or screenshot. Revoke the old one after the host works.
- **Do not commit** `.env.local`, recovery codes, or TOTP QR screenshots.

---

## Secrets and `.env` in production

| Variable | Public? | Notes |
|---|---|---|
| `JOURNAL_AUTH_PASSWORD` (or hash) | Never | Host secret store only. Rotate before go-live. |
| `SESSION_SECRET` | Never | Random; rotating it logs everyone out. |
| `JOURNAL_TOTP_SECRET` | Never | Treating this like a second password. |
| `JOURNAL_CONTENT_ROOT` | Never required to hide, but no need to publish | Absolute path inside the container. |
| `JOURNAL_CONTENT_GIT_REMOTE_URL` | Not a password, still don’t prefix `NEXT_PUBLIC_` | Repo must be **private**. |
| `JOURNAL_CONTENT_GIT_TOKEN` | Never | Fine-grained PAT, one repo, expiry. |

Build-time: these must be **runtime** env vars on the host, not baked into the Docker image. `.dockerignore` should continue to exclude `.env*`.

Logging: never print env, cookies, Authorization headers, or Git extraheaders. Current Git failures log `error` objects — after deploy, confirm the platform’s log UI is private to you.

---

## Git authentication and backup process

Keep the current model (local files authoritative, Git as backup). Harden the **edges**:

- Remote must be a **private** repo you own.
- PAT used only via existing `buildTokenAuthEnv()` (in-memory, one `git` process). Do not switch to embedding `https://token@github.com/...` in `origin` — that writes secrets into `.git/config`.
- Backup/Restore must go through `requireSession()` like every other action.
- Do not add a UI to change `JOURNAL_CONTENT_GIT_REMOTE_URL` — that would be an exfiltration feature.
- Single instance only (`withGitLock` is in-process). Horizontal scale is a data-corruption bug as well as a lock hole.
- GitHub account 2FA is part of journal security, not an optional GitHub nicety.

---

## Vercel / deployment-specific security notes

- **Vercel is still the wrong runtime** for this app (ephemeral disk, no reliable `git` binary). Security features on Vercel (firewall, preview auth) do not fix that.
- If preview deployments ever exist on any platform, **do not** attach the real content volume or the real Git PAT to previews.
- Serverless multi-instance would break in-memory rate limits and `withGitLock`. Stay on one always-on container.
- Platform env UIs are the secret store. Do not put secrets in Dockerfile `ENV`, git, or `NEXT_PUBLIC_*`.
- Trust the platform’s HTTPS; still set HSTS and `Secure` cookies yourself.

---

## Risks and things to watch out for

- **Shipping hosting (`IMPLEMENTATION_PLAN.md`) without Phase A** would put a bypassable journal on the internet. Treat Phase A as a go-live gate, not a follow-up.
- **In-memory rate limits and sessions reset on deploy/restart.** That logs you out and clears lockouts — acceptable for a personal single instance. Do not add a second replica “for reliability” without a shared store (which this plan deliberately avoids).
- **Locking yourself out of TOTP.** Keep recovery codes or be prepared to reset secrets in the host dashboard (you will be unable to log in until you do).
- **Cloudflare Access misconfiguration** (policy “everyone”, or tunnel pointing at the wrong service) is a self-inflicted outage or a self-inflicted hole. Test the deny path from a second browser/profile.
- **Markdown editor vs CSP.** A strict CSP may need a small allowlist for the editor; don’t disable CSP entirely to make the editor work.
- **False sense of security from `httpOnly`.** It stops cookie theft via `document.cookie`; XSS can still drive the UI as you. Sanitize HTML + CSP still matter.
- **Scanning of public PaaS URLs is routine.** Assume the login page will be found. That is why Gate 1 and rate limits exist.

---

## Suggested implementation order (short)

1. `requireSession()` on all Server Actions + UUID path checks.  
2. Real sessions + logout + timing-safe compare + login rate limit.  
3. TOTP **or** Cloudflare Access (both if you want maximum privacy).  
4. Security headers, open-redirect fix, Markdown sanitize, GitHub PAT/repo lockdown.  
5. Then, and only then, use the hosted URL for real entries.

No code in this document is meant to be pasted as a complete implementation; it is the spec for the hardening work.
