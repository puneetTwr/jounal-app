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

---

## 2026-08-17 — Phase 3 (GitHub-backed repository implementations)

- Moved the existing filesystem implementations, unchanged in behavior, from `src/features/{journal,template}/repository/*.ts` into `repository/filesystem/*.ts` (git-mv, then fixed the relative imports that shifted one directory deeper — `../errors`/`../mapper`/`../types`/`../validation` → `../../...`; same-folder `./entryFilePath` imports were untouched). Each now exports its singleton (`filesystemJournalRepository`, `filesystemTemplateRepository`) from its own `filesystem/index.ts`.
- Added `repository/githubApi/` for both features, implementing the same interfaces against `src/lib/githubApi` (Phase 2's client):
  - `journal`: `getEntry`, `listEntries`, `createEntry`, `updateEntry`, `deleteEntry`, plus `entryPath.ts` (validates the id as a UUID before building `journals/{id}.md` — the same path-traversal guard the filesystem adapter's `entryFilePath.ts` has, now protecting the GitHub Contents API path instead of a real filesystem path). `updateEntry`/`deleteEntry` retry once on `GitHubConflictError` (refetch the current `sha`, reapply) before letting a second conflict bubble up as a real concurrent-edit error.
  - `template` (read-only, matching `TemplateRepository`'s existing read-only contract): `getTemplate`, `listTemplates`, `entryPath.ts`.
- Extracted `src/lib/markdown/mapMarkdownContent.ts` (parse → mapper → validate, given raw content) out of `loadMarkdownEntryFile.ts` (which now just reads the file and delegates), so both the filesystem adapter's disk-read path and the new GitHub adapter's API-fetched content share the exact same parse/validate pipeline instead of duplicating it.
- Rewrote both features' top-level `repository/index.ts` to pick `filesystemXRepository` vs. `githubXRepository` once, at module load, via `getStorageBackend()` — `JournalService`/`TemplateService`/Server Actions/UI are unchanged, exactly as ADR-002 intended.
- Tests added: `githubJournalRepository.test.ts` (9 tests — not-found, parse success, list via tree+blob, create/already-exists, update/not-found, update-retries-once-on-conflict, delete/not-found, delete-success), `githubTemplateRepository.test.ts` (3 tests), `backendSelection.test.ts` (2 tests, proving `journalRepository` actually resolves to the right singleton object for each backend value). All against mocked `fetch`, no live network/GitHub dependency.

**Verification (full batch):** `pnpm test` — 6 files, 36/36 passing. `npx tsc --noEmit` — clean. `npx eslint .` — clean (exit 0). `npx next build` — succeeds (pre-existing, unrelated warnings only: Next's multi-lockfile workspace-root notice, and the `middleware`→`proxy` rename notice — both present before this work started).

**Next up (not started):** Phase 4 — nothing left to add there specifically (the contract-style tests above already cover both adapters' behavioral parity for the cases that matter); re-scope Phase 4 at resume time to just the gaps, if any. Phase 5 — hide "Backup to Git"/"Restore from Git" when `JOURNAL_STORAGE_BACKEND=github-api` (UI gate in `src/app/page.tsx` + a server-side guard in the two Git-backup Server Actions, not just hiding the button).

---

## 2026-08-17 — Phase 4 (shared contract tests across both adapters)

The one real gap identified when re-scoping this phase: `filesystemJournalRepository`/`filesystemTemplateRepository` had **zero** test coverage before today (no test framework existed anywhere in the repo before this migration work started) — only Phase 3's tests exercised the new GitHub adapter. Closed that gap with a genuine shared contract suite instead of one-off filesystem tests, so both implementations are proven behaviorally identical, not just independently "probably fine."

- `src/testSupport/inMemoryGithubRepo.ts` — a small, stateful fake of GitHub's Git Data/Contents API (tracks files by content-repo-relative path in a `Map`, generates a new sha on every write, rejects a stale sha with 409/422 exactly like the real API). Implements only the endpoints `src/lib/githubApi` actually calls — not a general-purpose GitHub mock.
- `src/features/journal/repository/__tests__/contract.test.ts` — `describe.each` over `[filesystemJournalRepository, githubJournalRepository]` (filesystem backed by a real temp directory via `mkdtemp`, GitHub backed by the fake above), 6 shared cases × 2 adapters = 12 tests: not-found → null, full create→read→update→delete lifecycle reflected in both `getEntry` and `listEntries` at each step, duplicate-id → `JournalEntryAlreadyExistsError`, update/delete-nonexistent → `JournalEntryNotFoundError`, invalid entry → `JournalValidationError` with nothing written.
- `src/features/template/repository/__tests__/contract.test.ts` — same pattern for the read-only `TemplateRepository` (no create/update/delete exists to test parity on, per its interface): not-found → null, a template placed directly in each backend's storage is visible via both `getTemplate` and `listTemplates`. 2 shared cases × 2 adapters = 4 tests.

**Verification (full batch):** `pnpm test` — 8 files, 52/52 passing (up from 36). `npx tsc --noEmit` — clean. `npx eslint .` — clean. `npx next build` — succeeds (same pre-existing, unrelated warnings as last time).

**Next up (not started):** Phase 5 — hide "Backup to Git"/"Restore from Git" when `JOURNAL_STORAGE_BACKEND=github-api` (UI gate in `src/app/page.tsx` + a server-side guard in the two Git-backup Server Actions, not just hiding the button — a direct Server Action call must fail closed too).

---

## 2026-08-17 — Phase 5 (hide Backup/Restore-to-Git on the github-api backend)

On the GitHub API storage backend every write already lands as a commit, so there's no separate local working tree left for these two buttons to operate on. Gated at two independent points, not just one:

- **Service layer (fails closed):** `gitBackupService.isConfigured()` now also requires `getStorageBackend() === "filesystem"` (previously only checked the two Git env vars — which are *also* required for `github-api` mode, so it used to wrongly report "configured" there). `gitBackupService.backup()` and `gitRestoreService.restore()` both return `{ status: "not-configured" }` immediately when the backend isn't `"filesystem"`, before touching `withGitLock`/the `git` CLI at all — so a direct call to either Server Action (bypassing the UI entirely) can't run a Git operation that doesn't apply in this mode.
- **UI layer (hides, doesn't disable):** new `isGitBackupFeatureAvailable()` Server Action (`src/features/git-backup/actions/isGitBackupFeatureAvailable.ts`), distinct from `isGitBackupConfigured()` — "not configured" means the feature applies but isn't set up yet (worth a disabled button + explanation); this means the feature doesn't apply at all. `src/app/page.tsx` now wraps the whole Restore/Backup button group in `{isGitFeatureAvailable && (...)}` instead of rendering it permanently disabled.
- Tests: `src/features/git-backup/services/__tests__/backendGating.test.ts` (5 tests) — `isConfigured()` across all three real states (filesystem+unconfigured, filesystem+configured, github-api-with-the-same-vars-set), plus both services' early-return path.

**Verification (full batch):** `pnpm test` — 9 files, 57/57 passing (up from 52). `npx tsc --noEmit` — clean. `npx eslint .` — clean. `npx next build` — one run hit a transient Turbopack worker timeout (`TurbopackInternalError: failed to receive message`, an environment hiccup unrelated to this change — tsc/eslint were already clean at that point); a second run succeeded cleanly with the same pre-existing warnings as every prior phase.

**Next up (not started):** Phase 6 (caching — explicitly deferred until real usage shows it's needed, per the plan) has nothing to build yet. Phase 7 — Vercel-specific platform config: consolidate the two inline `NODE_ENV` checks behind one `isProductionRuntime()` helper, add `TRUSTED_PROXY=vercel` support to `getClientIp()`, add `PRODUCTION_ORIGIN` for Server Actions' allowed origin, fix the `rehype-raw` XSS gap (checklist item 12), add a top-level `error.tsx`.

---

## 2026-08-17 — Phase 7 (Vercel platform config), Phase 6 skipped by request

User confirmed caching (Phase 6) isn't needed yet — skipped straight to Phase 7, all five items from the plan:

- **`isProductionRuntime()`** (`src/lib/config/runtimeConfig.ts`) — the two inline `process.env.NODE_ENV === "production"` checks (`next.config.ts`'s HSTS header, `authenticate.ts`'s cookie `Secure` flag) now both go through this one helper.
- **`TRUSTED_PROXY`** (`src/lib/config/trustedProxyConfig.ts`) — replaces `getClientIp()`'s old fixed try-fly-then-forwarded-for-then-real-ip fallback chain with an explicit `"none" | "fly" | "railway" | "render" | "vercel"` config value (default `"none"`, i.e. untrusted/`"unknown"`). Deliberately fails *toward safety* on a bad value (unlike `getStorageBackend()`, which fails loud) — the doc comment on `getTrustedProxy()` spells out why the two functions' failure directions differ. `"vercel"` and `"railway"` both trust `X-Forwarded-For`'s first hop (both platforms document that as the real client IP, edge-set rather than passed through from the client).
- **`PRODUCTION_ORIGIN`** (`src/lib/config/productionOriginConfig.ts`) — comma-separated origin list consumed by `next.config.ts`'s `experimental.serverActions.allowedOrigins`, omitted entirely (not set to `[]`) when unset so local dev and any deployment without a fixed domain yet keep Next's default same-origin inference untouched.
- **Checklist item 12 (raw HTML in journal content):** new `safeMarkdownUrlTransform()` (`src/features/journal/components/safeMarkdownUrlTransform.ts`, allows only `http(s)`/`mailto`/`#`) plus `skipHtml`, passed to `JournalContentView.tsx`'s `MarkdownPreview` (the actual live risk today) and defensively to `MarkdownEditor.tsx`'s `previewOptions` (currently `preview="edit"`, so no live preview renders at all right now — but this keeps a future switch to `"live"`/`"preview"` mode from silently reopening the gap).
- **`src/app/error.tsx`** — top-level error boundary (none existed before). Closes the "empty-volume crash" / "GitHub API outage crashes to a blank screen" gap flagged repeatedly across the planning docs: a real error now renders a plain in-app message with a "Try again" button instead of Next's raw error screen. Logs the real error server-side only, matching how Server Actions elsewhere avoid echoing raw error detail to the client.
- `.env.example` documents both new optional vars.
- Tests added: `runtimeConfig.test.ts` (3, via `vi.stubEnv` — `NODE_ENV` is typed read-only by Next's own ambient types, so a direct assignment fails `tsc`), `trustedProxyConfig.test.ts` (8), `productionOriginConfig.test.ts` (3), `getClientIp.test.ts` (6, mocking `next/headers`), `safeMarkdownUrlTransform.test.ts` (9, allowed vs. rejected URL schemes). `error.tsx` and the two `previewOptions`/`urlTransform` wiring changes weren't given component-render tests — no React component-testing setup (jsdom/@testing-library) exists in this repo, and adding one wasn't warranted for this change alone; verified by `tsc`/`eslint`/`next build` plus code review instead.

**Verification (full batch):** `pnpm test` — 14 files, 86/86 passing (up from 57). `npx tsc --noEmit` — clean (after switching the `NODE_ENV` test to `vi.stubEnv`, since direct assignment doesn't type-check). `npx eslint .` — clean. `npx next build` — succeeds, same pre-existing unrelated warnings as every prior phase.

**Next up (not started):** Phase 8 — actual deployment: provision the Vercel project, set env vars (`JOURNAL_STORAGE_BACKEND=github-api`, `TRUSTED_PROXY=vercel`, the existing auth/session/TOTP/Git vars — no `JOURNAL_CONTENT_ROOT`), deploy, and run through the plan's end-to-end validation (create/edit/delete a test entry, confirm matching commits land in the content repo, confirm Backup/Restore buttons are absent, confirm `Secure`/HSTS and rate-limiter IP behavior against the real deployment). This phase is inherently manual/external — not something to execute from this environment.

---

## 2026-08-17 — Phase 8 runbook written (`VERCEL_DEPLOYMENT_GUIDE.md`)

Phase 8 itself is still manual/external (provisioning an actual Vercel project and clicking through its dashboard isn't something this environment can do), but the step-by-step instructions for it are now written down, researched directly against Vercel's current docs rather than assumed:

- Fetched Vercel's live documentation (not relied on prior knowledge, since hosting-platform specifics shift): environment variables (dashboard + CLI, Production/Preview/Development scoping, "changes only apply to the next deployment"), request headers (confirmed `X-Forwarded-For` is edge-set/overwritten by Vercel itself, which is what makes `TRUSTED_PROXY=vercel` — added in Phase 7 — safe to trust), Vercel Functions limits, custom domains/SSL.
- **Correction surfaced by this research:** `VERCEL_DEPLOYMENT_REVIEW.md` cited "Hobby ~10s" function timeout — current docs show the default is now 300s (5 minutes) on every plan, Fluid Compute default for new projects. Noted explicitly in the new guide as an outdated-assumption correction, not silently fixed in place.
- `VERCEL_DEPLOYMENT_GUIDE.md` (new): prerequisites checklist, PAT creation, project import, the exact env var table for this app's `github-api` backend (explicitly: don't set `JOURNAL_CONTENT_ROOT`, leave `PRODUCTION_ORIGIN` unset unless another proxy/CDN sits in front of Vercel), a flagged risk around Preview deployments sharing the same real content repo as Production if the same secrets are scoped to both, deploy + smoke-test + end-to-end write-test steps, custom domain setup, ongoing-operations notes (redeploy-on-push, env var changes need a redeploy, PAT rotation order, monitoring via Vercel's Logs tab), and a troubleshooting table tied to this app's actual error types (`getStorageBackend()`'s fail-fast messages, `GitHubConflictError`, etc.).
- Added a short "historical" note to the top of `VERCEL_DEPLOYMENT_REVIEW.md` — its "not suitable for Vercel" verdict predates ADR-002 and no longer reflects the current architecture; left in place as the investigation record, not deleted.

**Verification:** documentation-only change — no application code touched, so no `tsc`/`eslint`/`next build`/`vitest` re-run needed for this entry.

**Next up:** actually running Phase 8's steps (a real Vercel project + real deployment) whenever the user is ready — external to this environment.
