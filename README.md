# Personal Journal App

A local-first, single-user journaling application. Entries are plain Markdown files with YAML front matter, stored on disk in a content repository you own and control — no database, no account, no vendor lock-in.

Built with [Next.js](https://nextjs.org) (App Router), React 19, and TypeScript.

## Philosophy

This is a personal tool, not a product. There is exactly one user, and that user is also the operator. Every architectural choice follows from that:

- **The filesystem is the source of truth.** Journal entries are Markdown files with YAML front matter, not rows in a database.
- **Your content lives outside this codebase.** The app points at an external, configurable content repository (its own Git history, its own lifecycle) rather than assuming your journal lives inside the application's own repo.
- **Works fully offline.** No remote server or third-party API is required for core functionality.
- **No database, no separate backend.** Next.js's Server Components, Server Actions, and Node's filesystem/Git access cover everything this project needs.

The full reasoning — including alternatives considered (PostgreSQL, SQLite, MongoDB, Notion, Obsidian, ...) and the trade-offs accepted — is written up in [`docs/architecture/ADR-001-local-first.md`](docs/architecture/ADR-001-local-first.md).

## Features

- **Journal list** — every entry, pinned-first then newest-date-first, with search and favorite/pinned/archived filters.
- **Create Journal** — pick a starting **template** (or start Blank), a title, and a journal date; lands you directly in the new entry's editor.
- **Templates** — reusable Markdown starting points (Blank, Daily Journal, Meeting Notes, Book Notes, Project Log ship by default) with placeholder variables resolved at creation time: `{{title}}`, `{{journalDate}}`, `{{createdAt}}`, `{{updatedAt}}`, `{{year}}`, `{{month}}`, `{{day}}`, `{{weekday}}`.
- **Journal detail & editor** — view and edit an entry's metadata (title, date, tags, favorite/pinned/archived) and its Markdown body, with a dark-mode-aware Markdown editor.
- **Delete Journal** — with confirmation.
- **Consistent dark theme** throughout, including reusable skeleton/spinner loading states so async data (like the template list) never flashes a placeholder value into view.

### Not yet built

- Template authoring (create/edit/delete templates) — templates are currently read-only, seeded as files on disk.
- Git-backed save workflow (versioning every entry change as a commit).
- Attachments (the directory structure anticipates this; no UI yet).
- Full-text search across entry content beyond the current title/content/tag substring match.

See [`docs/project-status.md`](docs/project-status.md) for a more detailed, point-in-time snapshot (note: written before the editor, templates, and search were built — treat it as historical, not current).

## Architecture

Each feature (`journal`, `template`) is organized as a strict layered stack; a layer only ever calls into the one directly below it:

```
UI (Server / Client Components)
  ↓
Server Actions        src/features/<feature>/actions/
  ↓
Service                src/features/<feature>/services/
  ↓
Repository             src/features/<feature>/repository/
  ↓
Filesystem / Markdown / Paths / Config   src/lib/
```

- `src/features/journal/` — journal domain model, repository, service, actions, and all journal UI components.
- `src/features/template/` — template domain model, read-only repository/service/actions, and `{{...}}` variable resolution.
- `src/lib/` — framework-agnostic infrastructure shared across features: `filesystem/` (disk I/O), `markdown/` (front-matter parsing/serialization), `validation/` (generic schema-validation primitives), `paths/` (content-root path derivation), `config/` (environment configuration).
- `src/components/ui/` — reusable, presentation-only UI primitives (currently the loading system: `Skeleton`, `SkeletonField`, `Spinner`, `FullPageLoader`).

## Content repository

Journal content lives outside this codebase entirely, at a location you configure — see [`docs/content-repository.md`](docs/content-repository.md) for the full structural contract. In short, the app expects:

```
<your-content-root>/
├── journals/     one Markdown file per entry, YAML front matter + body
├── attachments/  binary/non-Markdown files entries may reference
└── templates/    reusable Markdown starting points for new entries
```

You own this directory: where it lives, how it's backed up, and whether it's version-controlled are entirely up to you. The application never creates it — it must already exist, structured as above, before you start the app.

## Getting started

1. **Install dependencies** (this project uses [pnpm](https://pnpm.io)):

   ```bash
   pnpm install
   ```

2. **Point the app at a content repository.** Copy the example env file and set `JOURNAL_CONTENT_ROOT` to an absolute path containing `journals/`, `attachments/`, and `templates/` subdirectories (see above):

   ```bash
   cp .env.example .env.local
   ```

   ```
   JOURNAL_CONTENT_ROOT=/absolute/path/to/your/journal-content
   ```

   There is no default — the app fails fast on startup if this is unset.

3. **Run the dev server:**

   ```bash
   pnpm dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start the Next.js dev server (Turbopack) |
| `pnpm build` | Production build |
| `pnpm start` | Run the production build |
| `pnpm lint` | Run ESLint |

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router, Server Actions)
- [React 19](https://react.dev)
- TypeScript (strict mode)
- Tailwind CSS 4
- [`@uiw/react-md-editor`](https://github.com/uiwjs/react-md-editor) for the Markdown editor (dark-theme aware)
- [`gray-matter`](https://github.com/jonschlinkert/gray-matter) + [`js-yaml`](https://github.com/nodeca/js-yaml) for YAML front matter parsing/serialization
- [`react-markdown`](https://github.com/remarkjs/react-markdown) + `remark-gfm` for rendering saved entries

## Further reading

- [`docs/architecture/ADR-001-local-first.md`](docs/architecture/ADR-001-local-first.md) — why this project has no database or backend service
- [`docs/content-repository.md`](docs/content-repository.md) — the on-disk structure the app expects at `JOURNAL_CONTENT_ROOT`
- [`docs/project-status.md`](docs/project-status.md) — a historical snapshot of what was built and what wasn't, as of the date it was written
