# Vercel Migration Log

Running log of implementation steps for `docs/architecture/ADR-002-github-api-storage-for-vercel.md` / `VERCEL_IMPLEMENTATION_PLAN.md`. One entry per completed phase (or meaningful sub-step within a large phase), newest at the bottom. Each entry records what changed, how it was verified, and anything deferred or worth remembering later — not a line-by-line diff (that's what `git log` is for).

---

## 2026-08-17 — Planning complete

- Wrote `docs/architecture/ADR-002-github-api-storage-for-vercel.md` (decision: GitHub API storage adapter, selected via `JOURNAL_STORAGE_BACKEND`, filesystem stays default for local dev).
- Wrote `VERCEL_IMPLEMENTATION_PLAN.md` (8-phase build plan).
- Marked `HOSTING_ARCHITECTURE_PLAN.md` and `IMPLEMENTATION_PLAN.md` (both Option B / Railway-Fly-Render) as superseded, not deleted.
- No application code changed yet.

---

## 2026-08-17 — Test runner + Phase 1 (backend selection config) + Phase 2 (GitHub API client)

**Test runner (not its own plan phase, added as a prerequisite):**
- Added `vitest` (pinned to `^2.1.9` — the newest major failed to install due to an unrelated upstream `postcss`/`vite` version mismatch in the registry) as a devDependency, `vitest.config.ts` (resolves the existing `@/*` path alias), and a `pnpm test` script.

**Phase 1 — Backend selection config:**
- `src/lib/config/storageBackendConfig.ts` — `getStorageBackend()`, defaults to `"filesystem"` when `JOURNAL_STORAGE_BACKEND` is unset, throws on an unrecognized value, throws if `"github-api"` is selected without both `JOURNAL_CONTENT_GIT_REMOTE_URL` and `JOURNAL_CONTENT_GIT_TOKEN` set.
- Wired into `src/lib/config/index.ts`.
- `.env.example` updated: documents `JOURNAL_STORAGE_BACKEND`, and clarifies which of `JOURNAL_CONTENT_ROOT` / the two Git vars are required in which mode.
- Tests: `src/lib/config/__tests__/storageBackendConfig.test.ts` (6 tests, all passing).

**Phase 2 — GitHub API client:**
- New `src/lib/githubApi/` module (mirrors `src/lib/git`'s shape — small single-purpose functions, one shared error type, built on `fetch`, no new SDK dependency): `getTree` (Git Data API recursive tree, filtered to a directory prefix, throws on a truncated tree), `getBlob` (decode one blob by sha), `getFileContent` (Contents API read, returns `null` on 404 — mirrors the filesystem adapter's not-found contract), `putFile` (Contents API create/update, optimistic concurrency via `sha`, throws `GitHubConflictError` on 409/422), `deleteFile` (same conflict handling).
- `src/lib/config/githubApiConfig.ts` — `getGithubApiStorageConfig()` derives `{ owner, repo, branch: "main", token }` by parsing `JOURNAL_CONTENT_GIT_REMOTE_URL` (reuses the existing Git-backup credential/URL — no new secrets or owner/repo env vars). Throws on a non-`https://github.com/...` remote (SSH remotes, GitHub Enterprise, other providers not supported by this backend).
- Wired into `src/lib/config/index.ts`.
- Tests: `src/lib/githubApi/__tests__/githubApi.test.ts` (12 tests, mocked `fetch`) + `src/lib/config/__tests__/githubApiConfig.test.ts` (4 tests). All passing.

**Verification:** `pnpm test` — 3 files, 22 tests, all passing. `npx tsc --noEmit` — clean. `eslint`/`next build` not yet run (deferred to the end of this batch, per usual cadence — not yet done since work paused here).

**Next up (not started):** Phase 3 — swap the filesystem-only `journalRepository`/`templateRepository` singletons for a backend-selected pair (move existing implementations under `repository/filesystem/`, add `repository/githubApi/` using the client above), then Phase 4 (shared contract tests across both adapters).
