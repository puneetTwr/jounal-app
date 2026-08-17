# Security Review — Hosting a Private Journal on the Public Internet

Investigation only — no application code was changed. This builds on `VERCEL_DEPLOYMENT_REVIEW.md` and `IMPLEMENTATION_PLAN.md`, which already established: run the existing filesystem+Git architecture on a small host (Railway/Fly.io/Render/a VPS) with a persistent volume. This document assumes that plan and asks: once that host has a public URL, what stands between the internet and the journal, and is it enough?

## Direct answer to the main question: can authentication be bypassed today?

**No confirmed bypass was found.** Two specific hypotheses were tested directly against the app's own build output and code, not just reasoned about in the abstract:

1. **Could a request to the public `/login` path be made to invoke a different, sensitive Server Action (e.g. `deleteJournal`) by supplying its action ID?** Checked directly against `.next/dev/server/server-reference-manifest.json` (Next.js's own build manifest, which lists exactly which route each Server Action is reachable from). Every action except `authenticate` is registered only under `app/page` (`/`) and `app/journal/[id]/page` — both of which `src/middleware.ts` already gates. `/login`'s own build entry knows about `authenticate` and nothing else. So no, this specific path does not work today.
2. **Does middleware actually gate POST requests (Server Action invocations), not just page GETs?** Yes — middleware runs before route/action resolution regardless of HTTP method, and its matcher (`src/middleware.ts:43`) only exempts Next's internal asset routes; `isPublicPath()` only exempts `/login` and one static image, by exact pathname, for every method.

**However**, this safety currently rests entirely on those two mechanisms — middleware, plus an incidental consequence of how Next.js bundles Server Actions per route — and **no Server Action independently verifies the session itself**. That's not a bypass today, but it is a single point of failure: if either of those ever changes (a future `isPublicPath` edit, a Next.js version change to action bundling, a routing refactor), every mutating action becomes reachable pre-auth with nothing else to catch it. This is the single highest-value fix in this review — see 🔴 below.

**A separate, real, confirmed bug was found that isn't an auth bypass but deserves equal priority:** a path-traversal flaw in how journal/template files are located on disk. Full detail under 🔴 below.

## What's already solid — verified, not just assumed

Worth stating plainly so the rest of this document reads as a punch list on top of a sound base, not a rewrite:

- **Git credential handling is well-designed.** `buildTokenAuthEnv()` (`src/lib/git/tokenAuthEnv.ts`) injects the PAT as a single-invocation `http.extraheader` via `GIT_CONFIG_*` env vars — never written to `.git/config`, never in argv, never logged. `setRemoteUrl()` only ever persists the plain repo URL. This is better than the common naive approach (embedding the token in the remote URL, which `git` would happily write to disk in plaintext).
- **No XSS vector found.** `react-markdown` + `remark-gfm` render Markdown without `rehype-raw`, so raw HTML in a journal entry's content is not executed. No `dangerouslySetInnerHTML` exists anywhere in `src/` (checked directly). Titles/tags render as plain JSX text, which React escapes by default. Nothing to fix here.
- **The content repository (`my-journal-content`) is already a private GitHub repo** — confirmed via an unauthenticated API check (404, not 200), which is exactly the response private repos give. Your actual journal entries are not sitting in a publicly-reachable Git remote.
- **No secret has ever been committed to the app's own repo.** Checked `.env.local`/`.env` were never added (`git log --all -- .env.local .env` is empty), and pickaxe-searched the entire history/all branches for the literal password and token strings — no hits. `.gitignore` already excludes all `.env*` except `.env.example`, which contains no real values.
- **Write paths already validate the entry id as a UUID before touching disk.** `createEntry`/`updateEntry` call `validateJournalEntry()` (which enforces `validateUuid` on `frontMatter.id`) before ever building a file path — the bug below is specifically in the *read* and *delete* paths, not these.
- **IDs are generated with `crypto.randomUUID()`** (`JournalService.ts:230`), not a predictable scheme.
- Cookie is already `httpOnly`, already `sameSite: "lax"`, already conditionally `secure`. The mechanism just needs strengthening, not rebuilding (see 🔴).

## 🔴 Critical — must fix before this is reachable from the internet

**1. Path traversal in file lookup by id (CWE-22) — real bug, fix now.**
`getJournalEntryFilePath(id)` (`src/features/journal/repository/entryFilePath.ts:11`) and `getTemplateFilePath(id)` (`src/features/template/repository/entryFilePath.ts:11`) build a filesystem path by joining the raw `id` string directly, with **no format check**:
```ts
join(getJournalsDirectoryPath(), `${id}.md`)
```
- `getEntry(id)` (`repository/getEntry.ts`) — called by the `getJournal` Server Action, which is called directly from the `/journal/[id]` page's URL segment — reads whatever `${id}.md` resolves to, including outside the journals directory via `../` sequences, and renders it as if it were a journal entry if it happens to parse.
- `deleteEntry(id)` (`repository/deleteEntry.ts`) — same unsanitized join, then **deletes** whatever file it resolves to. This is the more serious half: an arbitrary-file-delete primitive (bounded to paths ending in `.md`), reachable through the `deleteJournal` Server Action with no id-format check anywhere in that call chain.
- The write paths (`createEntry`/`updateEntry`) are already safe, because they validate the full entry (UUID-checked id) before reaching this function — the gap is specifically in the id-only paths.

Today this requires an authenticated session to reach (both routes that expose these actions are middleware-gated). But it breaks a boundary that should hold regardless of auth state, and it compounds severely with any future regression in the auth-bypass analysis above — an unauthenticated arbitrary-file-read/delete primitive is a much worse bug than an authenticated one.

**Fix (simple, centralized, matches the existing code style):** validate `id` looks like a real UUID at the top of `getJournalEntryFilePath()`/`getTemplateFilePath()` themselves (reusing the existing `validateUuid` pattern from `src/lib/validation`), throwing immediately if not. One check, in one place each, automatically protects every current and future caller — no need to remember to check at every call site.

**2. Server Actions have no independent authentication check — add one.**
As covered above: every action (`getJournal`, `listJournals`, `updateJournal`, `updateJournalContent`, `updateJournalMetadata`, `deleteJournal`, `createJournal`, `backupToGit`, `restoreFromGit`, `getTemplateAction`, `listTemplatesAction`) trusts that if it was invoked, the caller must already be past middleware. None of them check the session cookie themselves. Add one small helper (e.g. `assertAuthenticated()` in `src/lib/auth/`, reusing the existing `isValidSessionToken()` + `getAuthPassword()` already in `src/lib/auth/session.ts`) and call it as the first line of every action except `authenticate` itself. Cheap, and it means the app's security no longer depends on a single layer plus a framework implementation detail holding forever.

**3. No rate limiting or lockout on the login form — add one.**
Confirmed: no rate-limiting library, no throttling anywhere in the codebase. `authenticate()` (`src/features/auth/actions/authenticate.ts`) will accept unlimited attempts, instantly, forever. Once this is on the public internet, this is the most likely real attack: a simple automated password-guessing loop. Because this is explicitly a single, always-on process (same assumption `withGitLock()` already relies on), a simple in-process limiter is proportionate — no Redis, no external service needed:
- Track failed attempts per IP (from `x-forwarded-for`, which Railway/Fly/Render all set correctly) in a module-scope `Map`.
- After ~5 failures, lock that IP out for a cooldown window (e.g. 15 minutes), extending on further attempts.
- This alone defeats casual brute-forcing and credential-stuffing scripts without adding any real complexity or a CAPTCHA.

**4. Strengthen the session token.**
Today (`src/lib/auth/session.ts`): the cookie value is `sha256(password)` — no salt, no server-only secret, no expiry beyond "browser session." Two concrete problems: (a) it's fully deterministic from the password alone, so a leaked cookie is crackable offline against a wordlist if the password is weak; (b) there's no way to invalidate one leaked session without changing the password for every session. Fix: introduce a separate, random, server-only `SESSION_SECRET` env var and HMAC the token with it (`HMAC-SHA256(SESSION_SECRET, password)` or, better, over a random per-login session id) instead of hashing the password alone. Small change, meaningfully closes the gap. Pair with an explicit cookie `maxAge` (e.g. 30 days) rather than relying on implicit "session cookie" behavior, which some mobile browsers preserve longer than you'd expect anyway (see Functionality Change 4 in `IMPLEMENTATION_PLAN.md`).

**5. Rotate both secrets before/at go-live.**
The current password is short and dictionary-like, and both it and the GitHub PAT have been sitting in a local plaintext `.env.local` (and were read during this review). Standard hygiene once a secret has been around this long and is about to matter for real: generate a new, long, random password, and mint a fresh fine-grained PAT for the hosted deployment rather than reusing the current one.

**6. Verify HTTPS is actually enforced, and that `secure` cookies are actually active, on the deployed instance.**
The cookie's `secure` flag is conditional on `process.env.NODE_ENV === "production"` (`authenticate.ts:29`). This should be true automatically for a proper `next build && next start`, but don't assume it — check it after deploying. Also explicitly confirm the platform doesn't leave a plain-HTTP listener reachable alongside HTTPS. Cheap to check, bad if silently wrong (the session cookie would be sendable over unencrypted HTTP).

**7. Enable 2FA on the accounts that actually hold the keys: GitHub, and whichever hosting platform you choose.**
Everything else in this document hardens the app. None of it matters if the GitHub account (owns both repos + can regenerate PATs) or the hosting platform account (owns the env vars, the volume, the deploy pipeline) gets taken over directly — that bypasses the app entirely. This is the cheapest, highest-leverage item on this list.

## 🟠 Recommended — strongly worth doing, more impactful than urgent

**8. Add a second factor (TOTP) to login, on top of the shared password.**
Directly addresses "strong authentication beyond a single password." A small dependency (e.g. `otplib`) plus one env var holding the TOTP secret and one extra 6-digit-code field on the login form meaningfully defeats pure password-guessing and credential-stuffing, since a correct password alone stops being sufficient. Not much more complex than what's already there.

**9. Seriously consider putting the app behind a private network instead of the open internet — the single biggest lever available.**
This is worth weighing before the rest of this list: instead of (or in addition to) a public HTTPS URL, put the app behind **Tailscale** (or Cloudflare Access) so it's only reachable from your own authorized devices, never from the open internet at all. This one change makes almost everything else in this document moot — there's no public attack surface left to brute-force, path-traverse, or credential-stuff, because the app was never reachable to begin with. The trade-off is real, though: you'd install a small client/app on each device you use (phone, laptop) instead of just opening any browser to a URL. You don't need both this and item 8 — either alone already changes the risk profile substantially; use both only if you want defense-in-depth beyond what either provides alone. This fits more naturally on a small VPS or home server than on Railway/Fly/Render (which are built around exposing a public URL), so it interacts with the hosting choice in `IMPLEMENTATION_PLAN.md` — worth deciding before provisioning.

**10. Make the `jounal-app` source repo private on GitHub.**
Confirmed via the public API: this repo is currently public (`"private": false`), while the content repo is correctly private. No journal content is exposed by this, but the exact implementation — including, right now, the path-traversal bug above until it's fixed — is publicly readable by anyone. Free to change, no reason for a personal single-user tool to stay public unless you specifically want it open-source.

**11. Explicitly pin the allowed origin(s) for Server Actions once you have a real domain.**
Next.js Server Actions already check the `Origin` header against the request's host by default (built-in CSRF protection — no code currently disables this in `next.config.ts`). Once deployed behind a specific domain, explicitly configure Next's allowed-origins setting for Server Actions to that exact domain rather than relying purely on the default same-host inference, particularly since the app will sit behind a platform's reverse proxy (check Next.js's current docs for the exact config key for your installed version, since this has moved/renamed across releases).

**12. Add a few cheap security headers.**
Nothing currently sets `X-Frame-Options`/`frame-ancestors`, `X-Content-Type-Options`, `Referrer-Policy`, or HSTS (`next.config.ts` has no `headers()` function today). Add these via a `headers()` entry in `next.config.ts`: `X-Frame-Options: DENY` (blocks clickjacking the login form via a hidden iframe), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Strict-Transport-Security` once HTTPS is confirmed. Cheap, no fragility.

**13. Log authentication events.**
No logging of any kind exists around login today (only two `console.error` calls total, both in the Git backup/restore services). Log timestamp + IP + success/failure for every `authenticate()` call to stdout — every platform under consideration (Railway/Fly/Render) already gives you a searchable log viewer for free, so this is a one-line addition, not new infrastructure. Note that every *content* change already has a natural audit trail for free: Git commit history via Backup to Git.

**14. Confirm the GitHub PAT's scope and expiry.**
It's already a fine-grained PAT (good — the `github_pat_` prefix confirms this, as opposed to a broad classic `ghp_` token). Confirm it's scoped to only the `my-journal-content` repo with only Contents read/write permission, has a real (non-infinite) expiration set, and put a reminder in place to rotate it periodically.

**15. Tighten `sameSite` from `lax` to `strict`, if you're comfortable with the trade-off.**
`lax` (current) allows the cookie on a top-level cross-site GET navigation (e.g. clicking a link to a specific entry from another app). `strict` closes that sliver further but means clicking such a link would land on the login page once instead of going straight through, even when already authenticated in that browser. Minor either way; `strict` is marginally safer.

## 🟢 Optional — genuine extra hardening, not necessary for "reasonably secure"

- **WebAuthn/passkeys** instead of/alongside TOTP — more modern and phishing-resistant, but real added implementation complexity (credential storage, browser API integration) for a single-user tool. TOTP already gets most of the practical benefit for far less effort.
- **A full custom Content-Security-Policy.** The cheap headers in item 12 cover the main risks; a real CSP for an app using Next.js's own hydration scripts takes real tuning to avoid breaking the app, for a marginal gain here (there's no third-party script/widget/ad surface to restrict in the first place).
- **Alerting** (email/webhook ping) on repeated failed logins, on top of the logging in item 13.
- **Encrypting journal Markdown files at rest.** Deliberately not recommended — see below.

## Explicitly not recommended — avoiding over-engineering

Called out on purpose, since you asked for the simplest architecture that's still genuinely secure:

- **CAPTCHA on login.** Unnecessary once rate limiting/lockout (item 3) is in place; adds friction and a third-party dependency for a single-user app that isn't a meaningful bot target beyond simple credential-guessing.
- **Application-level encryption of the Markdown files themselves.** This would directly undo the core property ADR-001 is built on — that any entry is a plain-text file readable by any editor, with clean Git diffs. The realistic threat this would defend against (someone obtaining a raw copy of the disk/volume) is already covered by the hosting platform's own at-rest disk encryption; confirm that's active (it almost always is by default on Railway/Fly/Render/major cloud VPS providers) rather than building custom crypto into the storage layer.
- **A separate session store / database / Redis for sessions or rate limiting.** The single-process, in-memory approach in items 3–4 is consistent with how `withGitLock()` already assumes a single always-on instance — adding external infra here would contradict that existing, deliberate simplicity.
- **Enterprise-style SSO/OAuth.** No second user to federate identity for; a shared password (hardened per above) plus optionally TOTP or a private network is proportionate.
- **Vercel-specific hardening** (preview-deployment protection, per-environment secret scoping, edge WAF rules). Moot given `IMPLEMENTATION_PLAN.md` already moved off Vercel toward a persistent host; the equivalent concern that *does* still apply is item 7 (secure the platform account itself).

## Suggested implementation order

1. Rotate the password and the PAT (5 minutes, unblocks doing everything else without re-exposing the old ones).
2. Fix the path-traversal bug (item 1) and add the Server Action auth guard (item 2) — both are small, self-contained code changes.
3. Add rate limiting/lockout (item 3) and strengthen the session token (item 4).
4. Decide on the auth model going forward: TOTP (item 8), a private network (item 9), or both — this affects how you finish setting up hosting, so decide before finalizing the deployment from `IMPLEMENTATION_PLAN.md`.
5. Flip the app repo to private (item 10), enable 2FA on GitHub + the hosting platform (item 7).
6. Round out with security headers (item 12), origin pinning (item 11), and auth logging (item 13) once the app is actually deployed and you have a real domain to configure them against.
7. Everything in 🟢 is take-it-or-leave-it, anytime.

Nothing above has been implemented — this is the plan to work through, ideally in roughly this order, alongside the hosting steps already in `IMPLEMENTATION_PLAN.md`.
