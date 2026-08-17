# Implementation Plan — Vercel Hosting via a GitHub API Storage Adapter

Implements `docs/architecture/ADR-002-github-api-storage-for-vercel.md`.
Read that first — this file is the "how," the ADR is the "why" and the
decision record. Supersedes `HOSTING_ARCHITECTURE_PLAN.md` and
`IMPLEMENTATION_PLAN.md`'s hosting choice (Railway/Fly/Render, Docker) —
both remain in the repo as the alternative that was evaluated and not
taken, not as active plans. The security-hardening work they and
`SECURITY_HARDENING_CHECKLIST.md` describe (auth, sessions, TOTP, headers)
is unaffected by this change and is not repeated here.

## 0. What doesn't change

Worth stating up front, since it's most of the app: `JournalService`,
`TemplateService`, every Server Action, every UI component, the Markdown
parsing/serialization layer, the auth/session/TOTP/rate-limiter code, and
the `JournalRepository`/`TemplateRepository` *interfaces* are all untouched
by this plan. Local development (`pnpm dev`, `docker compose up` if that's
ever built) keeps using the filesystem backend, unchanged, by default.

## 1. Phase: Backend selection config

**Current behavior** — `journalRepository`/`templateRepository` are
hardcoded to the filesystem implementation in their respective
`repository/index.ts`.
**Problem in hosted environment** — Vercel has no filesystem to back that
implementation with.
**Proposed architecture** — one config function,
`getStorageBackend(): "filesystem" | "github-api"`, reading a new
`JOURNAL_STORAGE_BACKEND` env var, defaulting to `"filesystem"`. When it
resolves to `"github-api"`, also validate (fail fast, same posture as
`getJournalContentRoot()` today) that `JOURNAL_CONTENT_GIT_REMOTE_URL` and
`JOURNAL_CONTENT_GIT_TOKEN` are both set — they move from optional
(Git-backup-only) to required in this mode.
**Files** — `src/lib/config/storageBackendConfig.ts` (new),
`src/lib/config/index.ts`.
**Env/config changes** — add `JOURNAL_STORAGE_BACKEND` to `.env.example`
(optional, default `filesystem`, document the `github-api` value and what
it requires).
**Testing** — unit tests: unset/`"filesystem"`/garbage all resolve to
`"filesystem"`; `"github-api"` without the two Git vars throws with a
clear message; `"github-api"` with both set resolves cleanly.
**Deployment validation** — n/a (pure config, exercised by every later
phase).

## 2. Phase: GitHub API client

**Current behavior** — `src/lib/git` shells out to a real `git` binary.
**Problem in hosted environment** — no `git` binary, no working tree, on
Vercel.
**Proposed architecture** — a new `src/lib/githubApi/` module, mirroring
`src/lib/git`'s shape (small, single-purpose functions, one error type),
built on `fetch` against `api.github.com` rather than a new SDK dependency
— consistent with this project's existing preference for thin wrappers
over the standard tool rather than an added abstraction layer. Functions:
  - `getTree(path)` — recursive tree listing under a path (Git Data API),
    returning `{ path, sha }` pairs.
  - `getBlob(sha)` — fetches and base64-decodes one blob's content.
  - `getFileContent(path)` — Contents API `GET`, returning `{ content, sha }`
    or `null` on 404 (mirrors the filesystem adapter's `getEntry`
    not-found contract).
  - `putFile(path, content, sha?, message)` — Contents API `PUT`; omitting
    `sha` creates, providing it updates; throws a typed
    `GitHubConflictError` on 409/422 so callers can retry.
  - `deleteFile(path, sha, message)` — Contents API `DELETE`.
  - Auth: every call sends `Authorization: Bearer <token>` using
    `JOURNAL_CONTENT_GIT_TOKEN` — the same token already used for
    Backup/Restore, now also used for reads, not just pushes.
**Files** — `src/lib/githubApi/{getTree,getBlob,getFileContent,putFile,
deleteFile,errors,index}.ts`, `src/lib/config/githubApiConfig.ts` (parses
owner/repo out of `JOURNAL_CONTENT_GIT_REMOTE_URL`).
**Env/config changes** — none beyond phase 1.
**Testing** — unit tests against a mocked `fetch` for each function's
success, 404, and conflict paths.
**Deployment validation** — none yet; exercised by phase 3.

## 3. Phase: GitHub-backed repository implementations

**Current behavior** — `journalRepository`/`templateRepository` singletons
wire directly to filesystem-backed functions.
**Problem in hosted environment** — covered above.
**Proposed architecture** —
  - Move the existing functions into
    `src/features/journal/repository/filesystem/*.ts` (pure rename/move,
    no behavior change) and add
    `src/features/journal/repository/githubApi/*.ts` implementing the same
    five functions against `src/lib/githubApi`, at path `journals/{id}.md`
    (identical naming convention to the filesystem adapter's
    `entryFilePath.ts` — one file per entry, named by UUID). Same move for
    `src/features/template/repository/`.
  - `repository/index.ts` for each feature picks the implementation once,
    at module load, based on `getStorageBackend()`:
    ```ts
    export const journalRepository: JournalRepository =
        getStorageBackend() === "github-api" ? githubJournalRepository : filesystemJournalRepository;
    ```
  - `updateEntry`/`deleteEntry` in the GitHub adapter: fetch current `sha`
    via `getFileContent`, attempt the write; on `GitHubConflictError`,
    refetch `sha` once and retry; if it conflicts again, throw (a real
    concurrent edit from two places — surfaced to the UI as a plain error,
    same "never silently overwrite" posture Backup/Restore already use).
  - `getEntry`/`getTemplate` return `null` on a 404 from `getFileContent`,
    matching the filesystem adapter's contract exactly — `JournalService`
    needs no changes.
  - `listEntries`/`listTemplates` use `getTree` + `getBlob` per file (no
    caching in this phase — see phase 6 for when/whether to add it).
**Files** — as above; `JournalRepository.ts`/`TemplateRepository.ts`
interfaces unchanged.
**Env/config changes** — none beyond phase 1.
**Testing** — see phase 4 (shared contract tests) rather than testing each
adapter in isolation only.
**Deployment validation** — none yet; exercised end-to-end in phase 7.

## 4. Phase: Contract tests across both adapters

**Current behavior** — no tests exist for the repository layer at all
(confirmed: no test runner is configured anywhere in the repo today).
**Problem in hosted environment** — nothing stops the two adapters from
silently drifting apart in behavior (e.g. one validates before checking
existence, the other after) since nothing asserts they're equivalent.
**Proposed architecture** — introduce a test runner (Vitest — fast,
zero-config for a Next.js/TypeScript project, no dependency on a browser
or DOM here) and one shared contract-test suite per repository interface,
parameterized over both implementations: create → get → update → delete →
verify-gone, get-nonexistent → null, create-duplicate-id → throws,
update/delete-nonexistent → throws, validation failure → throws before
touching storage. Run the GitHub adapter's contract tests against a
mocked `fetch` (fast, no live network dependency in CI) plus, once,
manually against a real throwaway test repo before first production
deploy (see phase 7).
**Files** — `vitest.config.ts` (new), `package.json` (add `test` script
and `vitest` devDependency),
`src/features/journal/repository/__tests__/contract.test.ts`,
`src/features/template/repository/__tests__/contract.test.ts`.
**Env/config changes** — none.
**Testing** — this phase *is* the testing.
**Deployment validation** — n/a.

## 5. Phase: UI — Backup/Restore become filesystem-only

**Current behavior** — `src/app/page.tsx` always renders
`RestoreFromGitButton`/`BackupToGitButton`, gated only on
`isGitBackupConfigured()` (are the two env vars set).
**Problem in hosted environment** — on the GitHub-API backend, both
buttons would either do nothing meaningful or actively confuse ("nothing
to back up" forever, since there's no separate local working tree to
diff against).
**Proposed architecture** — gate rendering on `getStorageBackend() ===
"filesystem"` in addition to the existing configured-check, so the
buttons disappear entirely (not shown-disabled — there's no "configure
this" fix available in this mode) once `JOURNAL_STORAGE_BACKEND=github-api`
is set.
**Files** — `src/app/page.tsx`,
`src/features/git-backup/actions/{backupToGit,restoreFromGit}.ts` (add
the same guard server-side, not just in the UI — a direct Server Action
call must fail closed too, not just hide its own button).
**Env/config changes** — none beyond phase 1.
**Testing** — component/unit test: given `github-api`, `isGitBackupConfigured()`-style
check returns false regardless of the two Git vars being set.
**Deployment validation** — confirm the buttons are absent on the deployed
Vercel URL.

## 6. Phase: Performance — caching (build only if actually needed)

**Current behavior** — n/a (new capability).
**Problem in hosted environment** — `listEntries()`/`listTemplates()` do
one Git Data API tree call plus one blob call per file, on every request
that needs the list (home page, search). For a personal journal's realistic
entry count this is likely fine within GitHub's rate limits and Vercel's
function timeout; it becomes a real problem only if entry count grows
large or the home page is loaded very frequently.
**Proposed architecture** — **do not build this in the initial rollout.**
Ship without caching first (correct by construction: every read hits
GitHub live, so there's no staleness to reason about), measure actual
latency/rate-limit consumption after real use, and only then add
`fetch`-level caching with an explicit tag (`revalidateTag("journal-content")`
called from `createEntry`/`updateEntry`/`deleteEntry` in the GitHub
adapter) if it's actually warranted. Building a cache invalidation scheme
speculatively, before there's a measured problem, is exactly the kind of
premature complexity this project's own architecture docs consistently
argue against.
**Files** — none yet.
**Deployment validation** — after go-live, watch response times on the
home page and GitHub's rate-limit response headers
(`x-ratelimit-remaining`) for a week of normal use before deciding whether
phase 6 is needed at all.

## 7. Phase: Vercel-specific platform config

Carried over from the prior (Option B) architecture review, still
applicable, adjusted for Vercel specifically:

- **Trusted proxy header** (`getClientIp()`) — Vercel populates
  `x-forwarded-for` reliably at its edge (unlike a raw client-supplied
  header). Add `"vercel"` as a `TRUSTED_PROXY` value, trusting
  `x-forwarded-for`'s first hop only when explicitly configured for
  Vercel — same "explicit config, not guessed fallback chain" fix
  identified in the earlier review, just naming Vercel instead of
  Fly/Railway/Render.
- **`NODE_ENV`-conditional logic** (`Secure` cookie flag, HSTS header) —
  consolidate the two existing inline `process.env.NODE_ENV === "production"`
  checks into one `isProductionRuntime()` helper in `src/lib/config`.
  Vercel sets `NODE_ENV=production` correctly for production deployments
  by default, but verify this after first deploy (checklist item 6) rather
  than assuming it.
- **Server Actions allowed origin** — once the production domain (Vercel's
  default `*.vercel.app` URL or a custom domain) is known, set
  `PRODUCTION_ORIGIN` and consume it in `next.config.ts`'s
  `experimental.serverActions.allowedOrigins`.
- **Raw HTML in journal content** (checklist item 12,
  `@uiw/react-markdown-preview`'s unconditional `rehype-raw`) — unrelated
  to hosting mechanics, still open, still worth fixing in the same pass:
  pass `skipHtml`/a safe `urlTransform` to both the read view and the
  editor's live preview.
- **`error.tsx`** — add a top-level error boundary. More important here
  than it was for the Docker plan: a GitHub API outage, an expired PAT, or
  a misconfigured `JOURNAL_CONTENT_GIT_REMOTE_URL` should render a clear
  in-app message, not a raw crash, since there's no server log tail
  conveniently open the way there might be on a VPS.
- **No `Dockerfile`/`docker/entrypoint.sh`/`output: "standalone"`** — all
  Docker-specific work from `HOSTING_ARCHITECTURE_PLAN.md` is dropped
  entirely; Vercel builds and runs the Next.js app directly, no container
  step involved.

**Files** — `src/lib/auth/getClientIp.ts`, `src/lib/config/runtimeConfig.ts`
(new), `next.config.ts`, `src/features/auth/actions/authenticate.ts`,
`src/features/journal/components/{JournalContentView,MarkdownEditor}.tsx`,
`src/app/error.tsx` (new).
**Env/config changes** — `TRUSTED_PROXY=vercel`, `PRODUCTION_ORIGIN=<url>`
once known, both added to `.env.example` as optional/documented.
**Testing** — unit tests per §3a/§3b's original design (mocked headers,
mocked `NODE_ENV`).
**Deployment validation** — confirm rate-limiter lockout keys on the real
client IP (not Vercel's edge IP) after a few deliberate bad logins against
the live deployment; confirm `Secure`/HSTS via DevTools per checklist item
6.

## 8. Deployment steps

1. Create the Vercel project, connect the app's GitHub repo (once it's
   private — `GO_LIVE_MANUAL_STEPS.md` item 4, unchanged by this plan).
2. Set environment variables in Vercel's dashboard: `JOURNAL_AUTH_PASSWORD`,
   `SESSION_SECRET`, `TOTP_SECRET` (unchanged), `JOURNAL_STORAGE_BACKEND=github-api`,
   `JOURNAL_CONTENT_GIT_REMOTE_URL`, `JOURNAL_CONTENT_GIT_TOKEN`,
   `TRUSTED_PROXY=vercel`. Do **not** set `JOURNAL_CONTENT_ROOT` — it's
   meaningless (and unused) in `github-api` mode.
3. Deploy.
4. Log in, confirm the existing journal entries (already pushed to
   `my-journal-content` via the filesystem app's own Backup-to-Git) appear
   — this is the real first end-to-end proof the GitHub adapter reads
   correctly.
5. Create a throwaway test entry via the hosted UI; confirm a matching
   commit appears on `github.com/.../my-journal-content`. Edit it; confirm
   a second commit with the expected diff. Delete it; confirm a removal
   commit. Delete the test entry's commits are expected to remain in
   history — that's Git working as intended, not a cleanup step to chase.
6. Confirm Backup/Restore buttons are absent from the hosted UI.
7. Run the go-live verification list at the bottom of
   `SECURITY_HARDENING_CHECKLIST.md`, plus this plan's phase 7 deployment
   validations.

## Testing strategy summary

**CI, before every deploy:** `tsc --noEmit`, `eslint`, `next build`,
`vitest run` (new — phase 4's contract tests plus phase 1/2/7's unit
tests, all against mocks, no live GitHub or network dependency, so CI
stays fast and hermetic).

**Only checkable against the real deployment:** the phase 8 steps above
(real commits landing in the real content repo), rate-limit/latency
behavior under real use (phase 6's decision gate), the trusted-proxy header
Vercel's edge actually sends, and `Secure`/HTTPS verification — none of
these can be meaningfully faked in CI.
