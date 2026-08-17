# Go-Live Manual Steps

The four remaining 🔴 must-fix items from `SECURITY_HARDENING_CHECKLIST.md` (items 5–8). All of them are account/deployment actions, not code — nothing in this file gets fixed by editing the repo.

**Suggested order:** do #1 (rotate secrets) and #4 (repo visibility) now — no deployment needed. Do #3 (2FA) now too. Deploy. Do #2 (verify HTTPS) immediately after deploying, before treating the hosted URL as the real journal.

---

## 1. Rotate `JOURNAL_AUTH_PASSWORD` and the GitHub PAT

**Why it matters:** both secrets have been exposed outside their normal "only ever touched by you, locally" boundary — read during the earlier security reviews, and (the TOTP secret specifically) echoed into an AI chat session while it was being tested. The GitHub PAT is the more serious of the two: it has push access to your private content repo (`my-journal-content`), so a leaked PAT is a direct line to your actual journal entries that never touches the app at all — no rate limiting, no TOTP, no session cookie stands in the way of it.

### 1a. New password

1. Generate a long random value — e.g. `openssl rand -base64 24`, or let a password manager generate one. Length matters more than memorability here; you'll never type it by hand if it's saved in a password manager.
2. Update `JOURNAL_AUTH_PASSWORD` in your local `.env.local`.
3. Once deployed, set the same value in your hosting platform's environment-variable dashboard (Railway: Project → Service → **Variables**).
4. Restart the app (redeploy, or restart the service) so the new value takes effect.
5. The old password stops working the moment the new one is loaded — it's a plain env var comparison, no migration window needed.

### 1b. New GitHub PAT

1. Go to [github.com/settings/tokens?type=beta](https://github.com/settings/tokens?type=beta) (fine-grained tokens).
2. **Generate new token** → Repository access → **Only select repositories** → `my-journal-content` only.
3. Permissions → **Contents: Read and write**. Nothing else.
4. Set a real expiration (90 days is a reasonable default; put a reminder on your calendar to rotate again before it lapses).
5. Generate the token and copy it immediately — GitHub only shows it once.
6. Update `JOURNAL_CONTENT_GIT_TOKEN` in `.env.local`, then in the hosting platform's env vars once deployed.
7. Click **Backup to Git** in the app to confirm the new token actually works.
8. Go back to [github.com/settings/tokens?type=beta](https://github.com/settings/tokens?type=beta) and **revoke the old token**.
9. (Optional sanity check) Confirm the old token no longer authenticates — e.g. a `git push` using the old credential should now fail.

---

## 2. Verify HTTPS and `Secure` cookies on the deployed host

**Why it matters:** the app already sets the session cookie's `Secure` flag conditionally on `NODE_ENV === "production"`, and the signed session token, TOTP, and rate limiting all assume the cookie travels encrypted. If the hosting platform doesn't actually set `NODE_ENV` the way you'd expect, the cookie silently gets sent over plain HTTP, and it becomes interceptable on any shared network — cafe wifi, a compromised router, anywhere between the browser and the server. This can only be checked after there's a real deployment to check.

### Steps

1. Deploy the app (Railway auto-provisions HTTPS on its `*.up.railway.app` domain, or on a custom domain once configured — Fly.io/Render work similarly).
2. Try loading the app over plain `http://` if the platform allows the request through at all. It should either redirect to `https://` automatically or refuse the connection outright — confirm there's no plain-HTTP path that actually serves the app.
3. Log in successfully at the `https://` URL.
4. Open browser DevTools → **Application** (Chrome) / **Storage** (Firefox) → **Cookies** → find the `journal_session` cookie.
5. Confirm its flags: `Secure` = true, `HttpOnly` = true, `SameSite` = `Lax`.
6. If `Secure` is **not** set, `NODE_ENV` isn't `production` at runtime on the host. Check the platform's build/start command is actually running `next start` in a production build (`npm run build && npm run start`), not `next dev`.
7. Re-check after any config change — this isn't a one-time check if you ever touch the deploy config again.

---

## 3. Turn on 2FA for the GitHub account and the hosting-platform account

**Why it matters most of all four:** this is one level above the app entirely. If your GitHub account (`puneetTwr`) is taken over, an attacker gets direct read/write to your content repo — reading your journal, or pushing tampered entries — without ever touching the deployed app. If your hosting-platform account is taken over, they get every environment variable in one dashboard (password, `SESSION_SECRET`, `TOTP_SECRET`, the PAT — all of it) plus direct access to the persistent volume the journal actually lives on. Every fix made inside the app assumes the attacker comes in through the app's front door; this is what stops them walking in the side entrance instead.

### GitHub

1. Go to [github.com/settings/security](https://github.com/settings/security).
2. **Enable two-factor authentication**.
3. Prefer an authenticator app (TOTP) or a hardware security key over SMS — SMS is vulnerable to SIM-swap attacks.
4. Save the recovery codes somewhere durable (a password manager) — **not** in this repo, not in a plain text file next to your journal content.
5. Confirm 2FA shows as enabled on the account.

### Hosting platform (Railway, or whichever you pick)

1. Open your account settings on the platform (Railway: account avatar → **Account Settings** → **Security**; Fly.io/Render have equivalent account security pages).
2. Enable 2FA, preferably via an authenticator app.
3. Save the recovery codes the same way as above.

---

## 4. Make the app's own source repo (`jounal-app`) private

**Why it matters:** lower severity than the other three, but not nothing. A public repo means anyone can read the exact tuning of your defenses — e.g. "lockout triggers at 10 failures per 15 minutes" becomes public knowledge, letting an attacker pace guesses just under that threshold forever. It also means any future accidental secret commit gets picked up by GitHub's automated public-repo secret scanners within seconds, versus staying unnoticed in a private repo long enough for you to catch and rotate it yourself. The content repo (`my-journal-content`) is already private and should stay that way — this step is specifically about the app's own code.

### Steps

1. Go to `github.com/puneetTwr/jounal-app` → **Settings** (repo settings, requires admin access on the repo).
2. Scroll to the **Danger Zone** at the bottom → **Change repository visibility** → **Make private**.
3. Confirm by typing the repo name when prompted.
4. Verify: log out of GitHub (or open an incognito window) and confirm `github.com/puneetTwr/jounal-app` returns a 404, the same way `my-journal-content` already does.
5. If your hosting platform deploys straight from this GitHub repo via an installed GitHub App/OAuth connection, double-check that connection still has access after the visibility change — some platforms need the GitHub App re-authorized to see repos that just went private.

---

## After all four

Once these are done (and the app is actually deployed), run through the **Go-live verification** checklist at the bottom of `SECURITY_HARDENING_CHECKLIST.md` before treating the hosted URL as the real journal.
