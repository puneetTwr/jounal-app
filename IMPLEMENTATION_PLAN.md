# Implementation Plan — Hosting the Journal App

> **Superseded 2026-08-17.** The operator chose Vercel specifically, which
> this plan's Option B (Railway/Fly/Render) doesn't fit — see
> `docs/architecture/ADR-002-github-api-storage-for-vercel.md` and
> `VERCEL_IMPLEMENTATION_PLAN.md` for the plan actually being implemented.
> Kept here as the record of the alternative that was evaluated and not
> taken, not as an active plan.

Goal: access the app from anywhere, with journal entries still safely backed up and synced to Git. This plan builds directly on the findings in `VERCEL_DEPLOYMENT_REVIEW.md`.

## How it's built today (context for the rest of this plan)

- **Storage**: Markdown files with YAML front matter on a real filesystem, at a path given by `JOURNAL_CONTENT_ROOT` (currently an external folder on your Windows machine — a sibling of this repo, not inside it). Reads/writes go through a strict layering: `Server Action → Service → Repository → src/lib/filesystem` (thin wrappers over `node:fs/promises`). No database, no API routes, no middleware except the auth check.
- **Git backup/restore**: two manual buttons on the home page shell out to a real `git` binary (`child_process.execFile`) against that same content folder — init/remote/stage/commit/push for Backup, fetch/merge for Restore. Both share a single in-process lock (`withGitLock`) so they can't run concurrently.
- **Auth**: already implemented. A single shared password (`JOURNAL_AUTH_PASSWORD`), checked in `src/middleware.ts`, backed by a hashed, `httpOnly` session cookie with no persistent "remember me" (browser-session cookie only).
- **Your content is already Git-backed and clean**: `my-journal-content` (external repo) has a clean working tree and its latest commit is already pushed. This makes migration low-risk — there's nothing uncommitted to lose.

## 1. Recommended architecture

**Keep the current local-first design exactly as it is. Change where it runs, not how it works.**

Concretely: run the app as an always-on container on a small host that provides (a) a real, persistent disk and (b) a real `git` binary at runtime — e.g. **Railway** (recommended below), with Fly.io, Render, or a small VPS as equally valid alternatives. Zero changes to the storage, repository, service, or Git-integration code. This is "Option B" from `VERCEL_DEPLOYMENT_REVIEW.md`.

**Why not rewrite storage instead (Option A — a Git-hosting-API backend)?** That's a genuine architectural project (rewriting the Repository layer to call GitHub's Contents API instead of the filesystem) whose only payoff is making Vercel specifically possible. Nothing about "access it from anywhere" requires Vercel. Rewriting storage would add API rate limits, network latency on every read/write, and a much bigger surface to build and test — the definition of unnecessary complexity for what you actually asked for. Per ADR-001's own terms, this kind of change deserves its own dedicated ADR if it's ever pursued — not something to back into as a side effect of hosting.

**Why Railway specifically:**
- Supports a persistent **Volume** mounted into the container at a fixed path — exactly what `JOURNAL_CONTENT_ROOT` needs.
- Builds straight from a `Dockerfile`, so you control the Node version and guarantee `git` is present at runtime (not guaranteed in a stock Node image).
- Automatic HTTPS + a public URL out of the box — no certificates or reverse proxy to hand-configure.
- Low ongoing ops burden: no OS patching, no manual TLS renewal, single service, single instance — proportionate to a single-user app.
- This also finally implements the Docker setup `ADR-001` anticipated but never built (`docker/` is currently an empty placeholder).

Fly.io and Render work the same way (persistent volume + Dockerfile + automatic HTTPS) — swap in either if you prefer that vendor; only the "create a volume" and "set env vars" steps look different. A small VPS (Hetzner/DigitalOcean) is also viable but pushes OS updates, TLS, and process management onto you — more ops for no real benefit at this scale.

**Confirm current pricing/free-tier details before committing** — hosting pricing shifts often and shouldn't be taken as fixed from this plan.

## 2. ⚠️ Functionality changes

**⚠️ FUNCTIONALITY CHANGE 1 — The password screen now guards the whole internet, not just your home network.**
Nothing about the login code changes, but what it's defending against does. Today it's a formality on your own machine; once hosted, it's the only thing between the public internet and your journal. Your current password is short and guessable — rotate it to something long and random as part of this migration (Phase 5 below).

**⚠️ FUNCTIONALITY CHANGE 2 — Editing from two places at once becomes a real scenario, not a theoretical one.**
Once the app also runs on a host, you effectively have two independently-editable copies of your content (your laptop and the hosted instance). The existing Restore-from-Git logic deliberately does **not** auto-resolve a same-file-changed-in-both-places conflict — it aborts and reports "conflict," requiring manual Git resolution outside the app (this is documented, existing behavior in `docs/git-restore-plan.md`, not new). Practical habit going forward: treat the hosted instance as the "live" copy; if you ever edit locally too, click **Restore from Git** before you start and **Backup to Git** when you finish.

**⚠️ FUNCTIONALITY CHANGE 3 — Backup/Restore stay manual buttons — but forgetting now risks more.**
No code changes here, but the consequence shifts: today, skipping "Backup to Git" just leaves work sitting on your own laptop. Once hosted, unsynced work sits only on the host's volume until you click Backup — so it's worth treating that button as the end of every real writing session, not an occasional chore.

**⚠️ FUNCTIONALITY CHANGE 4 — You'll likely notice the "no remember me" behavior more once you're on mobile.**
The session cookie is intentionally browser-session-only (already true today, not a change caused by hosting). Using the app from a phone browser that gets closed/reopened often will mean re-entering the password more frequently than you're used to on a desktop kept open all day. Not required to fix, just worth expecting.

## 3. Step-by-step implementation plan

### Phase 1 — Prepare the app for containerized hosting (in this repo)

1. In `next.config.ts`, add `output: "standalone"` — produces a minimal, self-contained server bundle suited to a small Docker image.
2. Add a multi-stage `Dockerfile` at the repo root:

   ```dockerfile
   # ---- deps ----
   FROM node:22-slim AS deps
   WORKDIR /app
   RUN corepack enable
   COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
   RUN pnpm install --frozen-lockfile

   # ---- build ----
   FROM node:22-slim AS builder
   WORKDIR /app
   RUN corepack enable
   COPY --from=deps /app/node_modules ./node_modules
   COPY . .
   RUN pnpm build

   # ---- runtime ----
   FROM node:22-slim AS runner
   WORKDIR /app
   # git must be installed explicitly — the stock slim image doesn't ship it,
   # and Backup/Restore shell out to a real `git` binary at runtime.
   RUN apt-get update && apt-get install -y --no-install-recommends git \
       && rm -rf /var/lib/apt/lists/*
   ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
   COPY --from=builder /app/.next/standalone ./
   COPY --from=builder /app/.next/static ./.next/static
   COPY --from=builder /app/public ./public
   COPY docker/entrypoint.sh ./entrypoint.sh
   RUN chmod +x ./entrypoint.sh
   EXPOSE 3000
   ENTRYPOINT ["./entrypoint.sh"]
   ```

   Debian-based `slim`, not `alpine` — this project allows building native modules (`sharp`, `unrs-resolver` per `pnpm-workspace.yaml`), which are simpler on glibc than musl.

3. Add `docker/entrypoint.sh` — makes first-boot on an empty volume self-healing instead of a manual step (see the "empty-volume" risk below):

   ```sh
   #!/bin/sh
   set -e

   if [ -n "$JOURNAL_CONTENT_GIT_REMOTE_URL" ] && [ -n "$JOURNAL_CONTENT_GIT_TOKEN" ] && [ ! -d "$JOURNAL_CONTENT_ROOT/.git" ]; then
     echo "Content root not yet initialized — cloning from Git remote..."
     git clone "$JOURNAL_CONTENT_GIT_REMOTE_URL" "$JOURNAL_CONTENT_ROOT"
   fi

   mkdir -p "$JOURNAL_CONTENT_ROOT/journals" "$JOURNAL_CONTENT_ROOT/attachments" "$JOURNAL_CONTENT_ROOT/templates"

   exec node server.js
   ```

4. Add a `.dockerignore`:
   ```
   node_modules
   .next
   .git
   docker
   docs
   content
   *.md
   .env*
   ```
5. *(Optional, closes an existing doc gap — ADR-001 anticipated Docker but it was never built)* Add a root `docker-compose.yml` for local use too, bind-mounting your existing local content folder instead of a named volume, so `docker compose up` becomes an alternative to `pnpm dev` that also matches how the hosted container runs.
6. Commit and push these files to the app's own repo (`jounal-app`) — they're deployment config, not journal content.

### Phase 2 — Provision hosting

7. Create a Railway project and connect the `jounal-app` GitHub repo as a service (Railway auto-detects the `Dockerfile`).
8. Add a **Volume** to the service, mounted at `/data/journal-content`.
9. Set environment variables on the service — same 4 names as your local `.env.local` today, just re-entered in Railway's dashboard:
   - `JOURNAL_CONTENT_ROOT=/data/journal-content`
   - `JOURNAL_AUTH_PASSWORD=<new, strong password — see Functionality Change 1>`
   - `JOURNAL_CONTENT_GIT_REMOTE_URL=https://github.com/puneetTwr/my-journal-content.git`
   - `JOURNAL_CONTENT_GIT_TOKEN=<a PAT with push access — consider minting a fresh one for this deployment>`
10. Deploy.

### Phase 3 — First boot

11. With the `entrypoint.sh` from Phase 1, first boot automatically clones `my-journal-content` into the empty volume before the app starts — no manual SSH step needed. Watch the deploy logs to confirm the clone happened.
12. Open the hosted URL, log in, confirm your existing journal entries appear.

### Phase 4 — Verify Git backup/restore end-to-end

13. Click **Backup to Git** once on the hosted instance — expect "Nothing to back up" (proves git + token + remote all work, since the seed clone was already current).
14. Create a throwaway test entry, click **Backup to Git** again, confirm the new commit appears on `github.com/puneetTwr/my-journal-content`.
15. From your local machine, click **Restore from Git** and confirm the test entry shows up locally too — proves both directions work. Delete the test entry and back up again once confirmed.

### Phase 5 — Lock it down

16. Confirm HTTPS is active on the Railway-issued URL (automatic).
17. Rotate `JOURNAL_AUTH_PASSWORD` to a long, random value.
18. Optional hardening, not required: a custom domain, or an extra layer in front (Cloudflare Access, Tailscale) if you want more than a single shared password standing between you and the internet.

## 4. Migration steps

- Nothing about the Markdown files changes — no schema migration, no data conversion. Migration is "clone the existing content repo onto the new host," not "transform the data."
- Your local `journalContent` folder is untouched by any of this — it keeps working exactly as it does today if you ever want to use the app locally/offline. Hosting **adds** a second, synced copy; it doesn't replace or move the local one.
- The Git remote (`my-journal-content`) becomes the hub both copies sync through. The two folders (local vs. hosted) are only ever as in-sync as your last Backup/Restore click — there's no automatic background sync.
- Because your content repo already has a clean working tree with everything committed and pushed, there's no "catch up local changes first" step needed — you're migrating from a known-good state.

## 5. Risks and things to watch out for

- **Empty-volume first-boot crash, if you skip the entrypoint script.** The home page (`src/app/page.tsx`) calls `listJournals()` unconditionally, before anything else renders — including the Restore-from-Git button itself. If `journals/` doesn't exist yet, that call throws and the page fails to load entirely; there's no error boundary to soften it. You cannot rely on clicking "Restore from Git" inside the app to bootstrap a brand-new empty volume, because the button never gets a chance to render. The `entrypoint.sh` in Phase 1 handles this automatically — don't skip it.
- **`git` must be explicitly installed in the runtime image.** Standard Node slim/alpine images don't ship it. If it's missing, Backup/Restore will just report a generic "error" status — the real detail is deliberately logged server-side only (`console.error`), not surfaced to the UI — so check container logs if either button ever reports a bare error.
- **Don't scale this service beyond a single instance.** `withGitLock()` is an in-process mutex; it only prevents Backup and Restore from racing each other within one running process. Multiple replicas would each have their own independent lock and could corrupt the shared working tree — exactly what the original Vercel review flagged. Single-instance hobby-tier hosting (the default on Railway/Fly/Render) avoids this; just don't turn on horizontal scaling.
- **No rate-limiting or lockout on the login form.** Fine on a private network; once public, a strong/long password (Functionality Change 1) is the practical mitigation rather than a code change.
- **Handle the GitHub PAT carefully during migration.** It currently lives in plaintext in your local `.env.local`. Enter it into Railway's (or whichever platform's) environment-variable UI rather than committing it anywhere, and consider minting a fresh, scoped token for the hosted deployment instead of reusing the exact same one — plus rotating periodically.
- **The persistent volume is not itself a backup strategy.** It's just durable disk for the container — if you never click Backup to Git, unsynced entries only exist there. The Git remote is still the actual off-machine backup; keep clicking Backup to Git after real writing sessions. (A scheduled/automatic backup is a reasonable future enhancement, but it's new functionality, not part of this hosting change.)
- **Confirm current platform pricing and persistent-volume support before committing** — this can shift over time and isn't something to take as fixed from this plan.
- **Minor, unrelated cleanup**: `content/` at this repo's root is an empty, untracked leftover folder — not your real content root (that's the external `JOURNAL_CONTENT_ROOT` path), not used by anything. Safe to delete whenever convenient; unrelated to this hosting work.
