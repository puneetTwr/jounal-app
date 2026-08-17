# ADR-002: GitHub API Storage Adapter, Selected at Runtime, for Vercel Hosting

## Status

Accepted

## Date

2026-08-17

## Context

`ADR-001-local-first.md` commits this project to the local filesystem as the
single source of truth, with Markdown files as the canonical format and Git
as the version-history mechanism. `VERCEL_DEPLOYMENT_REVIEW.md` (an
investigation-only pass, no code changed) evaluated hosting this
architecture on Vercel and concluded it does not fit: Vercel's serverless
functions have no persistent disk (only an ephemeral `/tmp`, not shared
across invocations, not guaranteed to survive a cold start) and no
guaranteed `git` binary at runtime. Every feature that touches
`JOURNAL_CONTENT_ROOT` — journal CRUD, templates, "Backup to Git", "Restore
from Git" — depends on both.

That review named two real paths forward and explicitly declined to pick
one, since the choice depends on which matters more: keeping the exact
current architecture (→ host somewhere with persistent disk instead of
Vercel), or using Vercel specifically (→ change how storage works). The
operator has now chosen Vercel. This ADR is the "own ADR" that review said
that choice would require, per `ADR-001`'s own terms: *"any future proposal
to add [something outside the local-filesystem model] should be treated as
a deliberate architectural change requiring its own justification and its
own ADR, not a routine implementation detail."*

`HOSTING_ARCHITECTURE_PLAN.md` (written before this decision, targeting
Railway/Fly/Render) is superseded by this ADR and the implementation plan
that accompanies it (`VERCEL_IMPLEMENTATION_PLAN.md`). It remains in the
repo as a record of the alternative that was considered and not chosen, not
as an active plan.

## Decision

Replace the filesystem as canonical storage with a **GitHub API–backed
implementation of the existing `JournalRepository` and `TemplateRepository`
interfaces**, selected at runtime by configuration — not by rewriting the
interfaces, the services, the Server Actions, or the UI, none of which
know anything about the filesystem today. Concretely:

1. **The `JournalRepository`/`TemplateRepository` interfaces do not
   change.** Both are already storage-agnostic contracts (`listEntries`,
   `getEntry`, `createEntry`, `updateEntry`, `deleteEntry`, and the
   template equivalents); every layer above them (`JournalService`,
   `TemplateService`, Server Actions, all UI components) calls only the
   interface. This ADR only replaces what's wired up *behind* it.

2. **Two implementations exist side by side**, not one implementation
   with environment branches inside it:
   - The existing filesystem implementation (`src/lib/filesystem` +
     `node:fs/promises`), unchanged, still the default.
   - A new GitHub API implementation, using GitHub's Git Data API (trees +
     blobs) for bulk listing and the Contents API for single-file
     create/update/delete, authenticated with the same personal access
     token the Git-backup feature already uses.

3. **Selection is one explicit config value**, `JOURNAL_STORAGE_BACKEND`
   (`"filesystem" | "github-api"`), read once, in one place, at the point
   each repository's singleton is constructed
   (`src/features/journal/repository/index.ts`,
   `src/features/template/repository/index.ts`). Default: `"filesystem"`
   — unset behaves exactly as the app does today, so this change is
   invisible to local development and to any non-Vercel host that still
   wants the original architecture. No business logic anywhere else ever
   inspects this value; it exists at exactly one seam.

4. **No new secrets.** The GitHub adapter reuses
   `JOURNAL_CONTENT_GIT_REMOTE_URL` (parsed for owner/repo) and
   `JOURNAL_CONTENT_GIT_TOKEN` (already a fine-grained PAT scoped to
   Contents read/write on that one repo) — the exact credential the
   Git-backup feature already uses for the exact same repository, just
   invoked over HTTPS API calls instead of a shelled-out `git` process.
   When `JOURNAL_STORAGE_BACKEND=github-api`, both become **required**
   (fail fast at startup, same posture as `JOURNAL_CONTENT_ROOT` today) —
   there is no "backend without its own storage location" state to
   silently degrade into.

5. **"Backup to Git" and "Restore from Git" become filesystem-only
   features.** When the GitHub adapter is active, every write already *is*
   a commit to the canonical repository — there is no separate local
   working tree to stage, commit, or push, and nothing to restore into. The
   buttons are hidden (not shown-but-disabled) when
   `JOURNAL_STORAGE_BACKEND=github-api`, driven by the same backend
   selection, not a duplicate check.

6. **Local development is unaffected.** With `JOURNAL_STORAGE_BACKEND`
   unset or `"filesystem"`, the app behaves exactly as it does today —
   same `pnpm dev`, same offline capability, same Backup/Restore buttons.
   The GitHub adapter only activates where it's explicitly configured,
   which in practice means the Vercel deployment's environment variables.

## Rationale

**Why an adapter behind the existing interface, not a rewrite.** The
Repository layer was already the correct seam for exactly this kind of
change — `VERCEL_DEPLOYMENT_REVIEW.md` noted this in passing ("the layered
architecture ... contains a lot of this — only the Repository layer's
internals would need rewriting"), and reading the actual code confirms it:
`JournalRepository` and `TemplateRepository` are plain interfaces with a
single filesystem-backed implementation exported as a module-level
singleton. Adding a second implementation and a one-line selection at that
singleton's construction site is a contained change. Nothing about
`JournalService`'s business logic (unique-title resolution, search/filter,
sort order) or any UI component needs to know which backend is active.

**Why runtime config selection, not an `APP_ENV`-style split.** This is
the one capability in the app where local and hosted *genuinely* need
different implementations — unlike the broader `APP_ENV` proposal
considered and rejected in the prior architecture review, which would have
duplicated business logic for concerns (cookies, headers, client-IP
resolution) that don't actually need it. Here, the two implementations
share nothing but an interface, which is exactly when a second
implementation is justified rather than a code smell. The config variable
name (`JOURNAL_STORAGE_BACKEND`) says precisely what it selects, and it's
consumed in exactly one file per feature — not scattered through services
or components.

**Why the Git Data API for listing, not one Contents-API call per file.**
The Contents API's per-path `GET` is simple but doesn't offer a "list and
read everything under a directory" primitive — fetching N journal entries
would mean N+1 API calls on every page load. The Git Data API's recursive
tree endpoint returns every path and blob SHA under `journals/` in one
call; blobs are then fetched by SHA. Still multiple calls, but a fixed,
predictable shape instead of scaling awkwardly, and it maps cleanly onto
GitHub's REST rate limits (5,000 requests/hour for an authenticated PAT —
ample for a single-user journal's read/write volume; confirm current
limits before relying on this figure, per this project's own convention of
not treating hosting-provider numbers as fixed).

**Why optimistic concurrency (blob SHA), not a lock.** The filesystem
adapter has no concurrency control today because it doesn't need one — one
process, one disk. The GitHub adapter can't assume that: two Vercel
function invocations could race to update the same entry. GitHub's
Contents API already requires the current file's `sha` on every
update/delete, which is optimistic concurrency for free — a stale `sha`
returns `409`/`422` instead of silently overwriting. The adapter surfaces
that as a typed error the Service layer can retry once (refetch `sha`,
reapply) before giving up, rather than reinventing locking.

**Why the in-memory login rate limiter and `withGitLock()` are an accepted
trade-off, not something this ADR fixes.** Both were built under Option
B's assumption (`IMPLEMENTATION_PLAN.md`, `SECURITY_HARDENING_CHECKLIST.md`
item 3's own comments): one always-running process, module-scope state
persists correctly. Vercel's model — multiple stateless instances, memory
reset on cold start — weakens (not eliminates) the rate limiter: a
concurrent burst across cold instances counts separately, and a lockout
doesn't survive a cold start. It doesn't disappear entirely — a sustained
attempt against one warm instance is still caught, and TOTP remains a full
second factor regardless of whether the rate limiter catches an attempt
first. `withGitLock()` becomes moot for the GitHub adapter specifically
(there's no shared local working tree to protect once every write is an
independent, atomic API call), so no fix is needed there. Given a
single-operator app already defended by two factors, reaching for an
external store (Vercel KV, Upstash) purely to restore the rate limiter's
original strength is a proportionate *future* improvement, not a
prerequisite for going live — call this out explicitly rather than
silently accepting a weaker posture without naming it.

## Alternatives Considered

**Vercel Blob (or similar object storage) instead of the GitHub API.**
Rejected: it would solve "persistent storage reachable from a Vercel
function" but not "Git as the version-history mechanism" — `ADR-001`'s
Git pillar exists specifically for commit history, diffs, and GitHub as a
redundant off-machine copy, none of which object storage provides on its
own. Adopting it would mean building a second, bespoke versioning scheme
on top, which is strictly more work than using GitHub's API directly
against the repository that already serves this purpose.

**A database (Postgres/SQLite via a hosted provider).** Rejected for the
same reasons `ADR-001` already rejected it for the original architecture,
unchanged by the hosting question: no query complexity this app actually
has, worse portability/human-readability than Markdown, and a new
operational dependency for a single-user tool. Choosing Vercel doesn't
change any of that reasoning.

**Staying on Railway/Fly/Render instead of Vercel (Option B).** This is
what `VERCEL_DEPLOYMENT_REVIEW.md` and `HOSTING_ARCHITECTURE_PLAN.md`
recommended if keeping the exact current architecture mattered most. It
remains architecturally simpler (zero storage-layer code change) and is
recorded here as the road not taken, not as a mistake — the operator's
priority is Vercel specifically, which this ADR serves.

**Reworking the app to fetch through GitHub's GraphQL API for batched
reads.** Not adopted for v1: it would reduce the Git Data API's multiple
REST calls to one batched query, which is a genuine future optimization if
entry count or API latency ever becomes a real problem, but it's added
complexity with no current, measured need — consistent with this
project's stated preference against solving problems that don't exist yet.
Left as a documented option in `VERCEL_IMPLEMENTATION_PLAN.md`, not built
now.

## Consequences

- Every journal/template read and write on Vercel now costs a network
  round trip to GitHub's API instead of a local disk access — slower than
  the filesystem path, and a new failure mode (GitHub API outage or rate
  limit) that didn't exist before. Both are accepted trade-offs of choosing
  Vercel; `error.tsx` boundaries (already planned in
  `VERCEL_IMPLEMENTATION_PLAN.md`) exist so this fails visibly, not
  silently.
- "Backup to Git" / "Restore from Git" are no longer universal features —
  they exist only for the filesystem backend. Anyone using the Vercel
  deployment day-to-day doesn't see them, and that's correct: there's
  nothing left for them to do once every write already lands in Git.
- Local development, and any future non-Vercel deployment that prefers the
  original architecture, are completely unaffected — same code path,
  same default, same offline capability.
- Two implementations of two interfaces now need to stay behaviorally
  identical (same validation, same not-found/already-exists semantics,
  same error types) — enforced by a shared contract-test suite run against
  both (see `VERCEL_IMPLEMENTATION_PLAN.md`'s testing section), not by
  inspection alone.
- The login rate limiter's real-world strength is now platform-dependent
  in a way it wasn't under Option B — documented above, not silently
  accepted.
