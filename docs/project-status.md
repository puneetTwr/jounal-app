# Project Status — Personal Journal App

_Last updated: 2026-07-27_

## What this is

A local-first, single-user journal app built with Next.js 16 (App Router) + React 19 + TypeScript. Journal entries are stored as Markdown files with YAML front matter on disk, at a location configured via the `JOURNAL_CONTENT_ROOT` environment variable (no database). Full rationale in `docs/architecture/ADR-001-local-first.md`.

## Architecture (implemented, stable)

```
UI (Server/Client Components)
  ↓
Server Actions        src/features/journal/actions/
  ↓
Journal Service        src/features/journal/services/
  ↓
Journal Repository     src/features/journal/repository/
  ↓
Filesystem / Markdown / Paths / Config   src/lib/
```

Each layer only knows about the one directly below it. The UI never touches the filesystem or the repository directly.

## What's built so far

| Layer | Status |
|---|---|
| Config, Paths, Filesystem, Markdown parsing (YAML front matter) | ✅ Done |
| Journal domain types, validation, Markdown↔JournalEntry mapper | ✅ Done |
| Journal Repository (CRUD against disk) | ✅ Done |
| Journal Service (business orchestration layer) | ✅ Done |
| Server Actions (`listJournals`, `getJournal`, `createJournal`, `updateJournal`, `deleteJournal`) | ✅ Done (update/delete actions exist but have no UI yet) |
| **Journal List page** (`/`) | ✅ Done — lists all entries, sorted pinned-first then newest-date-first |
| **Create Journal flow** | ✅ Done — "New Journal" button → dialog form (Title + Journal Date) → creates entry → redirects to list |

## What a user can actually do today

- View the list of all journal entries (title, journal date, last updated, tags, pinned/favorite/archived badges)
- Create a new entry by supplying a title and a date (everything else — id, timestamps, empty tags, default flags, empty body — is auto-generated)
- See the newly created entry appear in the list

## What does NOT exist yet

- No way to open/read an entry's content (no detail page)
- No editor — entries are created with an empty body and can't be written into
- No edit flow (no UI for `updateJournal`, even though the action exists)
- No delete flow (no UI for `deleteJournal`, even though the action exists)
- No search or filtering
- No tags/favorite/pinned/archived editing from the UI
- No Git integration (versioning of the content repo)
- No attachments, no templates
- No authentication (intentional — single-user, local-first by design)

## Known rough edges / decisions worth revisiting

- Journal entries are created with an **empty body** and there's currently no way to add content to them post-creation — a detail/editor page is the natural next step.
- `getJournalDetailPath()` exists in code (`/journal/[id]`) anticipating a future detail route, but that route doesn't exist yet — nothing links to it currently.
- Some throwaway test fixtures and a scratch verification script exist in the repo/temp dirs from development testing; not yet cleaned up.

## Natural next milestones (not yet decided/prioritized)

1. Journal detail/view page (read a single entry's content)
2. Editor to write/edit an entry's Markdown body
3. Edit flow for title/date/tags/favorite/pinned/archived
4. Delete flow with confirmation
5. Search
