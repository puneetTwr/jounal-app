# Vercel Deployment Review

> **Historical.** This review's "not suitable for Vercel" verdict was
> accurate when written, for the architecture that existed at the time.
> `docs/architecture/ADR-002-github-api-storage-for-vercel.md` documents
> the storage-layer change (a GitHub-API-backed adapter) that resolves
> the blocker described below; `VERCEL_DEPLOYMENT_GUIDE.md` has the
> actual step-by-step deployment instructions. Kept here as the record
> of the investigation that led to that decision.

Investigation only — no application code was changed. This file is the only artifact produced.

## Summary

**This application cannot be deployed to Vercel in its current form.** The blocker isn't a missing config value or a small compatibility shim — it's the core architectural decision this project was built on (see `docs/architecture/ADR-001-local-first.md`): the filesystem is the source of truth, at a path (`JOURNAL_CONTENT_ROOT`) the app expects to be a real, persistent, already-existing directory on disk, and the Git backup/restore features shell out to a real `git` binary against that same persistent directory.

Vercel's serverless functions have no persistent local disk (only an ephemeral `/tmp`, not shared or durable across invocations) and no guaranteed `git` binary at runtime. Every feature that touches `JOURNAL_CONTENT_ROOT` — which is every feature except pure client-side editor rendering — depends on both of those things existing.

This isn't a code-quality problem. The architecture was deliberately, explicitly chosen (ADR-001 spells out the reasoning at length) for a single-user, local-first tool. Vercel's execution model is the thing that doesn't fit here, not the code.

## Current architecture (as it actually is today)

- **Next.js 16, App Router.** Two routes (`/` and `/journal/[id]`), both Server Components. **No API route handlers exist anywhere** (`src/app` has no `route.ts` files) and **no middleware**. All mutation happens through Server Actions (`src/features/*/actions`). This part of the architecture is already serverless-shaped and would need no changes for Vercel.
- **Storage: plain files on disk**, not a database. `JOURNAL_CONTENT_ROOT` (an env var, absolute path, required — the app fails fast on startup if it's unset) points to an external directory containing `journals/`, `templates/`, `attachments/`. All reads/writes go through `src/lib/filesystem/*`, which are thin wrappers over `node:fs/promises`.
- **Git integration: shells out to the real `git` CLI.** `src/lib/git/*` wraps `child_process.execFile("git", ...)` for init/remote/add/commit/push/fetch/merge, all run directly against `JOURNAL_CONTENT_ROOT`. "Backup to Git" and "Restore from Git" are manual buttons on the home page (Server Actions, no route handlers).
- **No background jobs, queues, or long-running processes.** Everything is request-scoped. The one piece of shared, in-memory state is `withGitLock()` (`src/lib/git/gitOperationLock.ts`), a plain in-process boolean mutex serializing Backup/Restore against each other.
- **Docker is mentioned in ADR-001 as the environment-reproducibility mechanism, but doesn't actually exist** — `docker/` is an empty placeholder directory, no `Dockerfile`/`docker-compose.yml` in the repo. Aspirational, not implemented. Not itself a Vercel blocker (Vercel wouldn't use it anyway), but worth knowing the docs describe something that isn't there yet.
- A leftover `scratch-test-create.mts` sits at the repo root (already flagged in `docs/project-status.md` as unfinished cleanup from development). Not imported by app code, not a functional or security issue, just untidy.

## Feature-by-feature compatibility

| Feature | Works on Vercel as-is? | Why |
|---|---|---|
| Journal list / read / create / edit / delete | **No** | All go through `src/lib/filesystem` reading/writing at `JOURNAL_CONTENT_ROOT`. That path is a local absolute path on your machine today (e.g. `C:\Users\...\journalContent`) — it won't exist on Vercel at all. Even redirected to `/tmp`, writes wouldn't be visible across separate invocations/instances and aren't guaranteed to survive a cold start — entries could appear to save successfully and then vanish. |
| Templates (list/read) | **No** | Same `JOURNAL_CONTENT_ROOT` filesystem dependency as journals. |
| Search/filter | Works *if* the storage problem above is solved | Purely in-memory filtering over already-loaded entries — no fs-specific logic of its own. |
| Markdown editor (`@uiw/react-md-editor`) | **Yes** | Already a client-only component, dynamically imported with `ssr: false`. No server/filesystem dependency. |
| Autosave | Works *if* the storage problem is solved | The autosave mechanism itself (debounce + Server Action) is fine on serverless; it's what the Server Action tries to write to (disk) that's the problem. |
| Backup to Git | **No** | Two independent blockers: (1) Vercel's Node.js function runtime does not guarantee a `git` binary on `PATH` at runtime — this is different from Vercel's *build* environment, which does have git to clone your repo; the deployed function's own runtime container is a separate, minimal environment and `execFile("git", ...)` would very likely fail with `ENOENT`. (2) Even with git available, the design assumes a `.git` working directory that persists at `JOURNAL_CONTENT_ROOT` across separate button clicks (separate invocations) — impossible with stateless, ephemeral serverless instances. |
| Restore from Git | **No** | Same two blockers as Backup. |
| `withGitLock()` mutual-exclusion | **Would silently stop working correctly** | It's a plain in-process JS variable. On your current single always-running Node process, that's a real lock. On Vercel, concurrent requests can be served by entirely separate function instances with no shared memory — two Backup/Restore operations could run "simultaneously" from the app's perspective, with no cross-instance lock preventing it (moot in practice since #1/#2 above already break these features regardless). |
| Dark mode / styling / general UI | **Yes** | Pure CSS/Tailwind, no server dependency. |
| No API routes / middleware to migrate | **N/A, already fine** | There's nothing here to convert — Server Actions map directly onto Vercel's serverless functions. |

## `.env` / environment variables

Three variables exist today, and only three:

| Variable | Required? | Purpose | Vercel handling |
|---|---|---|---|
| `JOURNAL_CONTENT_ROOT` | Yes (app fails fast on startup without it) | Absolute local filesystem path to the content root | **This is the one that doesn't have a valid value on Vercel at all.** There's no equivalent "persistent, externally-owned directory" reachable from a Vercel function — this isn't a "set it to something else" fix, it's the architectural gap itself. |
| `JOURNAL_CONTENT_GIT_REMOTE_URL` | No (feature degrades gracefully if unset) | HTTPS URL of the private Git backup repo | Not a secret by itself (just a repo location), but should stay a plain server-side Vercel env var — never given a `NEXT_PUBLIC_` prefix. |
| `JOURNAL_CONTENT_GIT_TOKEN` | No (same graceful degradation) | GitHub PAT used to authenticate git push/fetch | **A real secret.** Must never get a `NEXT_PUBLIC_` prefix — that would bundle it into client-side JS, visible to anyone who opens dev tools. Should be added as a Vercel Environment Variable scoped server-side only (Vercel's default for a var without the `NEXT_PUBLIC_` prefix), ideally Production-only, and rotated if it's ever been pasted anywhere outside a secret store. |

Other observations:
- **No `NEXT_PUBLIC_*` variables exist today, and none are needed.** Confirmed none of these three are read from any `"use client"` file — all reads happen in `src/lib/config`, consumed only by Server Components/Services/Actions. Good separation already in place; nothing to fix here.
- `.env.local` and all `.env*` files are already git-ignored except `.env.example` (which correctly contains no real values) — no secret-hygiene issue in the repo today.
- The existing code already treats the Git token carefully server-side: it's passed to the `git` child process as a short-lived environment variable at push/fetch time only, never written to `.git/config`, never logged. That discipline is sound and would carry over unchanged into any future implementation — it's the *filesystem/git-CLI dependency itself*, not the credential handling, that's the Vercel problem.

## Vercel-specific limitations relevant here

- **No persistent disk.** Serverless functions get an ephemeral `/tmp` (not shared across invocations, not guaranteed to survive a cold start) and a read-only deployment bundle otherwise. There is no way to give a Vercel function a real, durable directory equivalent to today's `JOURNAL_CONTENT_ROOT`.
- **No guaranteed `git` binary at runtime.** Vercel's build step has git (to clone your source), but the deployed function's execution environment is a separate, minimal runtime — don't conflate the two.
- **Stateless, potentially concurrent, multi-instance execution.** Two requests can be served by two different function instances with no shared memory, which is exactly what the app's in-process `withGitLock()` can't protect against.
- **Execution time limits** (Hobby ~10s, Pro default ~60s, extendable on higher tiers) would matter for real git clone/fetch/push operations if they were ever made to run at all — a secondary concern behind the two points above, but worth knowing if any Vercel-compatible redesign ever reintroduces a "shell out to git" step.

None of this is a "just increase a timeout" or "just add a config flag" situation — it's a fundamental mismatch between "the filesystem is the source of truth, and Git is a real local repo" (the whole point of ADR-001) and "no persistent filesystem exists" (the whole point of serverless).

## Required changes (if Vercel is the goal)

This is a storage-architecture change, not a deployment tweak. Two real paths:

**Option A — Move canonical storage off local disk, onto a Git hosting API.**
Replace `src/lib/filesystem`'s direct disk reads/writes with calls to a real Git hosting provider's API (e.g., GitHub's Contents API) so every journal/template read or write becomes an API call instead of an `fs` call — no local clone, no persistent disk needed anywhere. The layered architecture (`Service` → `Repository` boundary) contains a lot of this — only the Repository layer's internals would need rewriting, not the Service/Action/UI layers. This also makes "Backup to Git" and "Restore from Git" largely redundant (every write is already directly in Git), so those features would be simplified away or repurposed. This is a genuine rework deserving its own ADR before implementation, given how deliberately this project has treated storage-model decisions so far (see ADR-001's own "Consequences" section: *"any future proposal to add [a database or backend] should be treated as a deliberate architectural change requiring its own justification and its own ADR, not a routine implementation detail"* — the same standard should apply here, in reverse).

**Option B — Keep the current architecture exactly as designed; change *where* it runs, not *how* it works.**
Host the Next.js app on infrastructure with a real, persistent disk and a real `git` binary — a small always-on VPS, or a container host like Fly.io/Railway/Render running `next start` (optionally via the Docker setup ADR-001 already anticipated but never built). Zero application code changes required. This directly solves "I don't want to manually run `npm run dev`" (it becomes an always-on deployed service you just visit in a browser) without touching the local-first philosophy at all.

There isn't a practical middle ground: Vercel specifically does not offer a persistent-disk option for its serverless functions, so a "Vercel, but with a mounted volume" hybrid isn't available the way it might be on a container platform.

## Recommended deployment approach

- **If keeping the local-first architecture as designed (the ADR-001 philosophy) matters**, don't use Vercel — use Option B: a small persistent host (VPS / Fly.io / Railway / a home server) running the app continuously. This is still a large usability win over `npm run dev` (an always-on URL, no manual start each time) and requires no code changes.
- **If Vercel specifically is the goal** (its zero-ops model, previews, etc.), that requires committing to Option A first: redesigning the storage layer around a Git hosting API instead of local disk + git CLI. That's a deliberate, scoped project of its own — worth planning as a dedicated next step (its own plan doc, mirroring how `git-backup-plan.md` and `git-restore-plan.md` were handled), not something to bolt on during the Vercel setup itself.

## Final verdict

**Not suitable for Vercel in its current form.**

Every feature that isn't purely client-side rendering (journal CRUD, templates, Backup to Git, Restore from Git) depends on a persistent local filesystem and a local `git` binary, neither of which Vercel's serverless runtime provides. This is a deliberate consequence of ADR-001's local-first design, not an oversight — fixing it means either changing where the app runs (keep everything, host elsewhere) or changing how it stores data (rework for Vercel specifically), and that second path is a genuine architectural project, not a deployment configuration task.
