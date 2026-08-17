# Security Hardening Checklist — Before Going Public

Single source of truth for what must be fixed before this app is reachable from the internet. Built **only** from the six uncommitted `.md` files in this repo (listed at the bottom) — nothing here is a new requirement invented outside them. Where those files disagreed with each other, this checklist takes the reconciled/corrected position and drops the superseded one.

**One correction surfaced while consolidating, flagged for transparency:** an earlier draft (`SECURITY_REVIEW.md`) judged Markdown XSS as already mitigated based on `react-markdown`'s safe defaults. A later review (`SECURITY_PLAN_REVIEW.md`) pointed out the app never actually renders through `react-markdown` — it renders through `@uiw/react-markdown-preview`. That was verified directly against the installed package for this checklist: it includes `rehype-raw` unconditionally, so raw HTML in a journal entry **does** render live today. See item 12.

---

## 🔴 Must-fix — required before any public URL

- [x] **1. Validate journal/template `id` before touching the filesystem.** `getJournalEntryFilePath()` / `getTemplateFilePath()` join a raw `id` into a file path with no format check — confirmed exploitable on the read (`getEntry`) and delete (`deleteEntry`) paths (write paths already validate UUID first). Fix in those two path helpers directly (reuse the existing UUID pattern), not at each call site, and resolve the final path to confirm it stays inside `journals/`/`templates/`.
- [x] **2. Check authentication inside every Server Action, not only in middleware.** Add one `assertAuthenticated()`/`requireSession()` helper; call it first in every action except `authenticate` (and a future `logout`). Middleware stays in place for browser-redirect UX, not as the only gate. (No live bypass of this was confirmed in testing, but every reviewing pass agrees this is required hardening against relying on a single layer — see the "what this is not" note below.)
- [x] **3. Rate-limit and lock out `authenticate`.** In-memory, single-instance is sufficient — no Redis, no CAPTCHA. Use the real client IP as set by the hosting platform's proxy (confirm which header/position Railway/Fly/Render actually populate — don't blindly trust the first `X-Forwarded-For` hop, which a client can spoof), plus a coarse global failure cap as a backstop. Around 10 failures / 15 minutes is safer than 5 given shared/CGNAT IPs. Never reveal which factor (password vs. second factor) failed.
- [x] **4. Replace the session cookie mechanism.** Today's cookie is an unsalted hash of the password alone — deterministic, identical on every device, no expiry, no revocation. Fix: a new `SESSION_SECRET` env var (random, server-only) plus a random per-login nonce and an explicit expiry, invalidated when the password changes. Keep `httpOnly`, `Secure` in production, `SameSite=Lax`. Add an explicit `maxAge` (~7 days). Add a `logout` action that clears the cookie.
- [ ] **5. Rotate both secrets before go-live.** New long, random `JOURNAL_AUTH_PASSWORD`. New fine-grained GitHub PAT scoped to only the content repo, Contents read/write, with a real expiry — revoke the old one once the new one works.
- [ ] **6. Verify HTTPS and `Secure` cookies are actually active on the deployed host.** Don't assume `NODE_ENV=production` is set correctly just because it should be — check it after deploying, and confirm there's no plain-HTTP fallback.
- [ ] **7. Turn on 2FA for the GitHub account and the hosting-platform account.** Every other item here is moot if either account is taken over directly — this protects the actual keys (repo, PAT, env vars, volume).
- [ ] **8. Make sure both GitHub repos have the right visibility.** Content repo (`my-journal-content`) must stay private — already confirmed private, just don't change that. The application's own source repo is currently **public** and should be made private (it currently publishes the exact implementation, including bug #1 until it's fixed).
- [x] **9. Add exactly one extra authentication factor beyond the password — not two.** Either TOTP on the existing login form (fits "open from any browser, any device"), or a private-network layer such as Cloudflare Access or Tailscale in front of the app (fits "the app doesn't need to be publicly reachable at all"). Pick based on how you actually want to use it day to day; layering more than one is unnecessary friction for a single-user app.

**What item 2 is *not*:** a documented, currently-exploitable hole. A direct empirical test (real Server Action IDs pulled from the build manifest, sent via raw HTTP with and without a valid session) showed the specific "POST a sensitive action to the public `/login` path" bypass does **not** work against this app today — the unauthenticated attempt returned an empty stub, not real data, while the authenticated call returned the genuine result. Item 2 is still required because that safety currently rests entirely on middleware plus an incidental framework bundling detail, with no independent check inside the actions themselves — worth closing regardless of today's manifest shape.

---

## ⚠️ Functionality & architecture changes this requires

- **Login stops being "type the password and go."** It becomes password + one more factor (a 6-digit code, or passing through a proxy login first) depending on which option is chosen in item 9.
- **Sessions now expire and can be revoked.** Expect to log in again roughly every ~7 days instead of staying signed in until the browser fully closes; a new "Log out" control appears; changing the password or rotating `SESSION_SECRET` now deliberately signs out every device at once.
- **Repeated wrong passwords will temporarily lock out further attempts** from that source. This is the intended effect of item 3, not a bug — there's no admin console to override it early.
- **Post-login redirects only work for in-app paths.** Deep links like `/journal/<id>` still work; external or protocol-relative redirect targets are now ignored (closes the open-redirect gap).
- **Backup/Restore keep the same buttons and behavior**, but now hard-require a valid session underneath, same as every other action.
- **Editing from two places (e.g. your laptop and the hosted instance) still requires the existing Restore-before-edit / Backup-after-edit discipline** — unchanged by this hardening pass, restated here because it's a real day-to-day behavior change once the app is reachable from more than one place.
- **The application's source repo moves from public to private** — no functional change to the app, just who can browse the code on GitHub.

---

## 🟠 Recommended — do in the same hardening pass

- [x] **10. Add cheap security headers** in `next.config.ts`: `X-Frame-Options: DENY` (or `frame-ancestors 'none'`), `X-Content-Type-Options: nosniff`, a `Referrer-Policy`, `Strict-Transport-Security` once HTTPS is confirmed, `X-Robots-Tag: noindex, nofollow`. Skip a full custom Content-Security-Policy — real tuning cost against the Markdown editor for little extra gain here.
- [x] **11. Fix the open redirect in the post-login `?next=` parameter.** `LoginForm` currently accepts anything starting with `/`, which allows protocol-relative URLs like `//evil.example`. Only allow a path that starts with a single `/`, not `//`, with no `://` and no backslash.
- [ ] **12. Stop raw HTML from rendering inside journal content.** Confirmed: `@uiw/react-markdown-preview` (the actual rendering engine, used for both the read-only view and the live editor preview) includes `rehype-raw` by default. Pass `skipHtml` and/or a `urlTransform` that rejects anything other than `http(s)`/`mailto`/`#` to the preview component in `JournalContentView.tsx` and `MarkdownEditor.tsx`. Lower-severity for a single author, but becomes real if a Restore ever pulls tampered content, or in combination with item 1.
- [x] **13. Log authentication events** (success, failure, lockout) with timestamp and IP to stdout — never the password, TOTP code, cookie, or PAT. The hosting platform's existing log viewer is enough; no new logging infrastructure.
- [ ] **14. Pin the allowed origin(s) for Server Actions once there's a real production domain**, rather than relying only on Next's default same-host inference — especially relevant if a proxy (e.g. Cloudflare) sits in front of the app.
- [ ] **15. Fix the hosting bootstrap script's Git clone.** The proposed first-boot entrypoint clones the private content repo directly (`git clone $JOURNAL_CONTENT_GIT_REMOTE_URL`), which fails without credentials — and the naive fix (embedding the token in the URL) would write it into `.git/config` on disk, undoing the careful credential handling already used for fetch/push. Use the same short-lived `extraheader` pattern for the initial clone too.
- [ ] **16. Re-confirm the GitHub PAT's scope at go-live**, not just at creation: fine-grained, one repo only, Contents read/write only, real expiry set — not a broad classic token.

---

## 🟢 Optional — worth having, not required to go live

- [ ] Passkeys/WebAuthn instead of, or alongside, TOTP.
- [ ] A visible "Log out" button (small addition once sessions have a real expiry).
- [ ] TOTP recovery codes — or just rely on resetting the secret via the host's env var dashboard, which is already available.
- [ ] Idle timeout in addition to the absolute session expiry.
- [ ] `__Host-` cookie name prefix — easy to get subtly wrong behind a proxy, low value add on top of the rest.
- [ ] Constant-time password comparison — real, but lower value once the password itself is long and random; rate limiting matters more. If added, compare fixed-length hashes rather than raw strings.
- [ ] Alerting (email/webhook) on a burst of failed logins, on top of plain logging.
- [ ] Disk/volume encryption at rest — the hosting platform's default is already reasonable; don't build custom encryption into the storage layer.
- [ ] A step-up password re-prompt before destructive actions (Delete, Restore).
- [ ] IP allowlisting — brittle for travel/mobile use, only worth it with a stable static IP.
- [ ] Scheduled/automatic Backup-to-Git — an availability nicety, not an access-control fix.
- [ ] If `attachments/` is ever served over HTTP as real files in the future, it must go through the same auth as journal entries — not a current gap, since no such route exists yet, but worth remembering if that feature is built later.

---

## Explicitly out of scope — do not build these

Called out repeatedly, and consistently, across the source documents as unnecessary complexity for a single-operator personal app:

- CAPTCHA on login.
- Hashing the shared password at rest (Argon2id/scrypt) — there's no user database to protect from a dump; the secret already lives only as an env var either way, next to every other secret.
- A full, hand-tuned Content-Security-Policy.
- Redis or any external store for sessions or rate limiting — stay in-memory, single always-on process.
- Session libraries like `iron-session`/`jose` — a hand-rolled signed cookie using the Web Crypto API already in use is enough.
- Requiring TOTP **and** Cloudflare Access/Tailscale **and** the app password all at once — one extra factor is the target, not a stack of three.
- User accounts, OAuth, SSO, or any multi-tenant authorization model — there is, and will remain, exactly one operator.
- Encrypting the Markdown files themselves at rest — undermines the plain-text, Git-diffable design the app is built on; rely on the platform's disk encryption instead.
- Moving to Vercel, or treating any Vercel-specific security feature (WAF, preview-deployment protection) as relevant — wrong runtime for this app's persistent-disk-plus-git-CLI architecture, independent of security.
- Tightening `SameSite` to `Strict` — `Lax` plus Next's built-in Origin check is already enough CSRF defense here, and `Strict` mainly breaks legitimate deep links for no real gain.
- Adding a duplicate auth check into every Server Component page on top of Server Actions — middleware already covers plain page GETs; the actual gap is in the actions.

---

## Go-live verification

Run through this once the checklist above is implemented, before treating the hosted URL as the real journal:

- [ ] An unauthenticated request cannot list, read, update, or delete journals, or trigger Backup/Restore.
- [ ] A crafted `id` containing path-traversal characters is rejected outright, not silently resolved.
- [ ] Login lockout actually triggers after repeated bad attempts.
- [ ] The session cookie is confirmed `HttpOnly` and `Secure` over real HTTPS.
- [ ] The content repo still returns 404 when checked while logged out of GitHub.
- [ ] The GitHub PAT cannot see or access any repo other than the intended one.
- [ ] Backup still completes successfully; Restore still refuses to write conflict markers into a journal file rather than silently overwriting.

---

## Sources consulted (all uncommitted `.md` files in the repo)

`VERCEL_DEPLOYMENT_REVIEW.md`, `IMPLEMENTATION_PLAN.md`, `SECURITY_REVIEW.md`, `SECURITY_HARDENING_PLAN.md`, `SECURITY_PLAN_REVIEW.md`, `SECURITY_PLAN_REVIEW_CLAUDE.md`.

Nothing in this checklist has been implemented yet.
