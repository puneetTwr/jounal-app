# Security Plan Review

Created by **Cursor** as a second security/architecture review. This is a review and validation pass only — no application code was changed.

**Reviewed:** `SECURITY_REVIEW.md` (primary), plus `SECURITY_HARDENING_PLAN.md`, `IMPLEMENTATION_PLAN.md`, and the current codebase.

The two existing security docs disagree on whether authentication can be bypassed today. This review reconciles that, cuts over-engineering, and produces one implementation plan.

---

## 1. Overall assessment

`SECURITY_REVIEW.md` is a good punch list and is **closer to the right scope** than `SECURITY_HARDENING_PLAN.md`. The important code findings are real: path traversal on read/delete, no auth check inside Server Actions, no login rate limit, a weak session cookie, and a short password that must be rotated before any public URL exists.

It also overstates certainty in two places, and it understates a few cheap issues.

- **Do not ship a public URL** until path traversal is fixed, Server Actions check the session themselves, login is rate-limited, and the password/PAT are rotated.
- **Do not build two login gates, Argon2, a full CSP, Redis, passkeys, or a user table.** That is complexity without a matching threat.
- **“Only one person will use this” is not a security control.** It correctly means: skip multi-tenant features. It does *not* mean the internet is empty, that a shared password is safe to hand to a partner, or that middleware will stay correct forever.

Use **Section 7** as the implementation spec. Treat `SECURITY_REVIEW.md` and `SECURITY_HARDENING_PLAN.md` as background, not as two competing checklists.

---

## 2. 🔴 Critical issues / missing protections

These should be done before the hosted app is used for real journal entries.

### 2.1 Path traversal on read/delete — confirmed

Claude is right, and this is a real bug.

`getJournalEntryFilePath()` / `getTemplateFilePath()` join the raw `id` into a filesystem path. `createEntry` / `updateEntry` validate UUID first; `getEntry` / `deleteEntry` / `getTemplate` do not. `deleteJournal` is an arbitrary `.md` delete (within what `path.join` can resolve). `getJournal` can read a `.md` file outside `journals/` if it happens to parse as a journal.

Fix it **in those two path helpers**, not at every call site. Reuse the existing UUID pattern. Resolve the path and reject anything that does not stay under the journals/templates directory (Windows `..\` as well as `../`).

Today this is behind middleware. It must still be fixed: it is a broken filesystem boundary, and it becomes much worse if auth ever fails.

### 2.2 Server Actions do not check auth — required, regardless of the “bypass” debate

Claude concluded: **no confirmed bypass**, because `.next/dev/server/server-reference-manifest.json` lists sensitive actions only under `/` and `/journal/[id]`, which middleware already gates.

That check is useful as a snapshot. It is **not** a security boundary.

- Next.js documents Server Actions as public HTTP endpoints. The `workers` map is a bundling/loading table, not an ACL.
- Middleware is the only gate, and Next.js has had middleware-bypass CVEs. This app is on 16.2.12 (likely patched) — the architectural gap remains.
- `/login` is public for every method. A POST that lands there (including via a **307 redirect**, which keeps the POST body) is the obvious place a future bundling change would hurt.
- This review did not re-run a live exploit against a production build, and you should not need one. Official guidance is: check the session inside the action.

**Assumption to reject:** “If the manifest looks right today, we can ship without in-action auth.”

**Do this:** one `assertAuthenticated()` helper, first line of every Server Action except `authenticate` (and a future `logout`). Middleware stays for redirects only. Do **not** also sprinkle the same check through every Server Component page — that is duplicate work; middleware already covers GETs.

### 2.3 No brute-force protection on login — confirmed

Unlimited `authenticate()` attempts. Once the URL is public, this is the likely real attack, especially with the current short password.

In-memory per-IP lockout on a **single instance** is the right size. Do not add Redis or CAPTCHA.

**Fix Claude’s IP plan:** do not blindly trust the first `x-forwarded-for` value. Clients can spoof that header unless the platform overwrites it. Prefer the address the reverse proxy actually sets (often the *rightmost* appended hop, or `x-real-ip` — confirm on Railway/Fly/Render). Also keep a **coarse global** failure cap so header spoofing cannot cheaply reset the bucket.

Expect CGNAT / café Wi‑Fi to share an IP: ~10 failures / 15 minutes is less self-lockout-prone than 5.

### 2.4 Session cookie is not a session

Current token is unsalted `SHA-256(password)`: deterministic, same value on every device, no expiry, no logout, stolen cookie works until the password changes, and a weak password is offline-guessable from the cookie.

Claude’s proposed fix of `HMAC-SHA256(SESSION_SECRET, password)` is **only a partial fix**. It stops offline cracking of the cookie without the server secret, but the cookie is still the same for every browser, still has no expiry unless you add one, and still cannot be revoked per device.

**Do this instead (still no database):**

- New `SESSION_SECRET` (32+ random bytes).
- Cookie = HMAC of `{exp, nonce}` (random nonce per login) plus a version that changes when the password changes (e.g. a `SESSION_VERSION` env, or a short hash of the password kept only server-side).
- `httpOnly`, `Secure` in production, `SameSite=Lax`, `Path=/`.
- Explicit `maxAge` (7 days is enough; 30 days is convenience, not a security requirement).
- Logout = delete the cookie.

Do **not** add `iron-session` / `jose` / Redis unless this HMAC cookie proves painful. Web Crypto is already in use.

### 2.5 Rotate the password and the GitHub PAT before go-live

Agreed with Claude. The current password is short. Both secrets have lived in local `.env.local`. New long random password (password manager). New fine-grained PAT, one private repo, Contents only, with an expiry. Revoke the old PAT.

### 2.6 HTTPS / `Secure` cookies must be verified on the host

Agreed. `secure: NODE_ENV === "production"` is easy to get wrong if the process is not actually production. Confirm HTTPS redirect and that the cookie is marked `Secure`.

### 2.7 GitHub + hosting-account 2FA

Agreed. App hardening does not matter if GitHub or Railway/Fly/Render is taken over.

### 2.8 What is *not* a confirmed internet-facing bypass today

There is **no second, independent “open URL dumps all journals” bug** in the routes themselves. Page GETs to `/` and `/journal/[id]` do go through middleware.

Do not treat “no confirmed `/login` action swap today” as permission to skip 2.2.

---

## 3. 🟠 Recommended changes

Worth doing in the same hardening pass. None of these require new infrastructure.

### 3.1 Pick **one** extra gate — not two

Claude: TOTP **or** Tailscale/Cloudflare Access, not both. That is correct.

`SECURITY_HARDENING_PLAN.md` made “TOTP or Access, preferably both” plus a public app password into a default. That is too much friction for a personal journal.

**Choose based on how you want to open the app:**

| Goal | Extra gate |
|---|---|
| Any browser, any device, public HTTPS URL | **TOTP** on the existing login form |
| Origin not on the public internet | **Cloudflare Access** (email OTP, no client install) or **Tailscale** (client on each device) |

Claude lumped Cloudflare Access with Tailscale as “install a client on each device.” That is **wrong for Cloudflare Access**. Access is a browser email/IdP check. Tailscale is the one that needs an app.

If you want “from anywhere” as in `IMPLEMENTATION_PLAN.md`, **TOTP is the extra factor that matches that goal.** Cloudflare Access is the stronger perimeter if you are willing to add that vendor. Do not require both.

### 3.2 Make the **application** GitHub repo private

Claude caught this; it is cheap and worth doing. Journal *content* is already in a separate private repo (Claude verified the content repo 404s unauthenticated). The **app** repo being public publishes the path-traversal bug, auth design, and hosting plan to anyone. Flip it private unless you explicitly want it open-source.

### 3.3 Cheap headers — skip a full CSP

Add via `next.config.ts`: `X-Frame-Options: DENY` (or `Content-Security-Policy: frame-ancestors 'none'`), `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer` (stricter than Claude’s `strict-origin-when-cross-origin`, and better here because `/journal/<id>` and `?q=` search URLs should not leak in `Referer`), `Strict-Transport-Security` once HTTPS is confirmed, `X-Robots-Tag: noindex, nofollow`.

Do **not** start a custom CSP. Next + `@uiw/react-md-editor` will fight it. Claude was right to park CSP in optional.

### 3.4 Open redirect after login — missed in `SECURITY_REVIEW.md`

`LoginForm` does `nextPath.startsWith("/")`. That allows `//evil.example`. After a successful login, `router.replace` can send the browser off-site. Phishing aid, not a journal dump.

Allow only a relative path: starts with `/`, does not start with `//`, no backslashes, no `://`.

### 3.5 Log auth success/failure/lockout

One `console` line with timestamp + IP. Never password, TOTP, cookie, or PAT. Host log UI is enough. No alerting product.

### 3.6 Pin Server Action allowed origins once you have a real domain

Next already checks `Origin` vs host (CSRF). After a custom domain — and **especially if Cloudflare is in front** — set `experimental.serverActions.allowedOrigins` (check the Next 16.2 docs for the current key). A Tunnel/proxy is the main way this default breaks.

### 3.7 Markdown XSS — Claude checked the wrong renderer

Claude: no XSS because `react-markdown` + `remark-gfm` without `rehype-raw`, and no `dangerouslySetInnerHTML` in `src/`.

**`react-markdown` is in `package.json` and is never imported in `src/`.** The live view is `@uiw/react-md-editor` → `@uiw/react-markdown-preview`, which depends on `rehype-raw`. Current defaults often `skipHtml: true`, but the library’s own `urlTransform` is the identity function, which **turns off** react-markdown’s default `javascript:` URL filtering.

For a single author this is mostly self-XSS. It becomes real if Restore pulls a compromised GitHub repo, or if an attacker who can write an entry then waits for you to open it.

**Do not add a full sanitizer stack unless you confirm HTML/`javascript:` actually renders.** Do pass `skipHtml` explicitly if the preview allows it, and/or a `urlTransform` that rejects non-`http(s)`/`mailto`/`#` URLs. That is enough.

### 3.8 Confirm PAT scope and GitHub repo privacy yourself at go-live

Claude’s unauthenticated 404 check on the content repo is the right test. Re-run it. Confirm the PAT is fine-grained, that one repo, Contents only, not a classic `ghp_` token.

### 3.9 Docker first-boot clone (hosting plan footgun)

`IMPLEMENTATION_PLAN.md`’s entrypoint is `git clone "$JOURNAL_CONTENT_GIT_REMOTE_URL"`. A private repo will fail unless credentials are provided. The naive fix — putting the PAT in the clone URL — writes the token into `.git/config`. That undoes the careful `buildTokenAuthEnv()` design.

When you implement hosting, clone with the same extraheader/env pattern already used for fetch/push. Never embed the PAT in `origin`.

### 3.10 `SameSite=Lax` is fine

Claude suggested `Strict` as a maybe. Skip it. `Lax` + Next’s Origin check is enough CSRF defense for this app. `Strict` mainly breaks “open this entry from another app” and is not worth the UX cost.

---

## 4. 🟢 Optional improvements

Skip these unless you still want them after Section 7 is done.

- TOTP recovery codes (or just reset the secret in the host dashboard — you already have that channel).
- Logout button (small; do it if sessions last 7 days).
- Passkeys/WebAuthn — better than TOTP, much more code.
- Idle timeout on top of `maxAge`.
- `__Host-` cookie prefix — easy to get wrong behind a proxy.
- Timing-safe password compare — real but low value once the password is long and random; rate limiting matters more. If you do it, hash both sides to a fixed length first; `timingSafeEqual` throws on unequal lengths.
- Argon2 hash in env — **see Section 6.** A leaked env dump also has `SESSION_SECRET`, TOTP, and the PAT. Hashing only the password does not save you.
- WAF, login alerting, IP allowlists, audit logs of every read, volume encryption beyond what the host already does.
- Step-up password prompt before Delete / Restore — reasonable later; not needed to go live.
- When attachments are actually served over HTTP, they must go through the same auth as journals. The folder exists in the content contract but is not a web route today.

---

## 5. What Claude got right

- Path traversal on id-only read/delete; writes already UUID-check.
- In-action auth as defense in depth even if today’s manifest looks safe.
- In-memory login lockout on one process; no Redis/CAPTCHA.
- Git PAT handling (`GIT_CONFIG_*` extraheader, not stored in `.git/config`, `execFile` not a shell) is already good — keep it.
- Content repo private; `.env` gitignored; no `NEXT_PUBLIC_` secrets; fail-closed if password/content root missing.
- Rotate password + PAT; 2FA on GitHub and the host account.
- Make the **app** repo private.
- Do not encrypt Markdown at rest; that fights ADR-001.
- Do not add SSO, a session database, or Vercel-specific WAF work.
- TOTP **or** a private network, not a product identity stack.
- js-yaml `CORE_SCHEMA` is a safe-enough YAML load (no `!!js/function`). Not called out, but the code is fine.

---

## 6. What should be removed or simplified

Drop these from the implementation checklist.

| Idea | Why drop it |
|---|---|
| Cloudflare Access **and** TOTP **and** app password as the default | Three gates for one human. Pick one extra gate. |
| `HMAC(SESSION_SECRET, password)` as the session design | Still one global, non-expiring-unless-you-add-it token. Use expiry + nonce. |
| `iron-session` / `jose` / Redis | Unnecessary for a single Node process. |
| `assertAuthenticated()` on every page Server Component | Middleware already redirects GETs. Put the check in Server Actions. |
| Argon2 password hash in env | Same env dump has every other secret. |
| Full Content-Security-Policy | High break-risk, low extra gain here. |
| `__Host-` cookie, `SameSite=Strict` | Marginal; proxy/UX cost. |
| CAPTCHA, passkeys, file encryption, user accounts, SSO | Out of scope. |
| Treating Vercel WAF as relevant | Wrong runtime; in-memory rate limits also **do not work** on serverless. If this app is ever moved to Vercel later, lockout becomes fake. Stay on one container. |
| “Manifest says no bypass, so we are safe” | Snapshot, not a control. |
| “Only I will use it, so authorization can stay implicit forever” | True for not building tenants. False for treating a stolen session as “still just me.” Any valid session is full admin: read all, delete all, Restore (overwrite disk), Backup (push to GitHub). There is no second user to isolate — and also no way to limit a stolen cookie. That is acceptable **only if** getting a cookie is hard (strong password, rate limit, real sessions, optional TOTP). |

### The “single user” assumption, specifically

Keep it as a **product** constraint: one operator, one password, one content tree, no accounts.

Do not use it to skip:

- Rate limiting (“nobody else knows the URL” — PaaS URLs get scanned).
- In-action auth (“I’ll never have two users” — attackers are not users).
- Path checks (“I’d never pass `../`” — the Server Action accepts any string).

If you ever share the password with someone, they can empty the journal and push that to GitHub. There is no role, no audit of *who*, and no undo except Git history. That is fine for you-alone. It is not “a small multi-user app later.” A second person is a new project.

---

## 7. Final recommended security approach

This is the plan to implement. It is the intersection of what is actually required and what is still simple.

### Architecture

- Keep Markdown files + Git backup on **one always-on container with a volume** (`IMPLEMENTATION_PLAN.md`). Do not move to Vercel for security or hosting.
- Keep **one shared password**. No user table, no OAuth, no API gateway.
- Middleware = redirect unauthenticated browsers to `/login`.
- Server Actions = the real security boundary (`assertAuthenticated()`).
- Git remains off-machine backup to a **private** repo with a scoped PAT, using the existing extraheader design.

### Extra factor (pick one)

- **Default for “open in any browser”:** TOTP on the login form.
- **Default for “I do not want a public origin”:** Cloudflare Access (or Tailscale if you already live in it).

Do not implement both unless you explicitly want that friction.

### Implement before a public URL (mandatory)

1. UUID (+ containment) checks in `getJournalEntryFilePath` / `getTemplateFilePath`.
2. `assertAuthenticated()` at the top of every Server Action except `authenticate` / `logout`.
3. In-memory login rate limit (per-IP using the proxy’s real client IP, plus a global cap). Generic error text. ~10 failures / 15 minutes.
4. `SESSION_SECRET` + HMAC cookie with `exp` + per-login `nonce` + password-change invalidation. `Secure` + `httpOnly` + `SameSite=Lax`. `maxAge` ~7 days. Logout clears the cookie.
5. Long random password; new fine-grained PAT; revoke the old one.
6. Confirm HTTPS and `Secure` cookies on the deployed host.
7. GitHub 2FA + hosting-account 2FA; content repo private; app repo private unless you want it public.

### Implement in the same pass if cheap (should-do)

8. Security headers listed in 3.3 (not a full CSP).
9. Fix `next` open redirect.
10. Auth success/failure logs (no secrets).
11. TOTP **or** Cloudflare Access/Tailscale (the one you picked).
12. `skipHtml` / safe `urlTransform` on the Markdown preview if the editor allows `javascript:` or raw HTML.
13. Hosting clone/bootstrap must not write the PAT into `.git/config`.
14. After a custom domain (or Cloudflare), pin Server Action allowed origins.

### Explicitly out of scope

CAPTCHA, Redis, Argon2, full CSP, passkeys, SSO, encrypting `.md` files, a second login proxy *on top of* TOTP, Vercel, multi-user authorization.

### Go-live checks

- Unauthenticated request cannot list/read/update/delete journals or run Backup/Restore.
- `id=../...` is rejected.
- Login lockout fires after repeated failures.
- Cookie is `HttpOnly` + `Secure` on HTTPS.
- Content repo still 404s while logged out of GitHub.
- PAT cannot see any other repo.
- Backup still works; Restore still refuses to leave conflict markers in files.

Nothing in this file has been implemented. Use **this Section 7** as the spec for the hardening work, then follow `IMPLEMENTATION_PLAN.md` for hosting.
