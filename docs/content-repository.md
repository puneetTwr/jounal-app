# External Content Repository Structure

## Purpose

This document defines the directory structure the application expects to find at its configured content root. It exists so that anyone — including the application's own author, returning after time away — can manually assemble a compatible content repository without reading application source code, and without running any part of the application itself.

This is a structural contract, not an implementation guide. It describes what the application requires to find on disk; it says nothing about how the application arrived there, and nothing about how that location should be created, hosted, or backed up.

## Ownership

The application owns the **structure** of the content repository: the set of subdirectories it expects, and what each one is for. The application does not own the **repository** itself.

Concretely, that means:

- The application does not create the content repository. Whoever operates the application is responsible for making sure a compatible directory tree exists at the configured location before the application is started.
- The application does not decide where the repository lives, how it is named, how it is backed up, or whether it is version-controlled. All of that is entirely up to whoever owns the data.
- The content repository's lifecycle is independent of the application's lifecycle. The repository can predate the application, outlive it, be moved between machines, or be managed by entirely different tooling — the application only needs the structure described below to be present at the location it is told to look.

This separation is deliberate: it keeps the application's own codebase and the user's personal data as two genuinely independent things, consistent with this project's local-first, ownership-first philosophy.

## Locating the repository

The application is told where the content repository lives through a single environment variable, `JOURNAL_CONTENT_ROOT`, which must be set to an absolute filesystem path. There is no default location, and the application will not fall back to a conventional path such as `./content` if this is unset — see the project's `.env.example` and `README.md` for configuration details.

Everything described below is relative to that configured path.

## Required structure

```
journal-content/
├── journals/
├── attachments/
└── templates/
```

`journal-content/` above is a placeholder name for illustration — the directory itself can be named anything; what matters is that `JOURNAL_CONTENT_ROOT` points at it, and that it directly contains the three subdirectories below.

### `journals/`

Holds the actual journal entries: one Markdown file per entry, each with YAML front matter describing that entry (its date, title, tags, and similar metadata) followed by the entry's written content.

This is the primary directory the application reads from and writes to during normal use. It is expected to grow continuously over the life of the journal — potentially organized into subdirectories (for example, by year) as the collection grows, though the application does not require any particular internal organization beyond the files being Markdown.

### `attachments/`

Holds binary or non-Markdown files referenced by journal entries — images, scanned documents, audio recordings, or any other media a journal entry might link to or embed.

Keeping attachments in their own directory, separate from `journals/`, keeps the primarily-text journal entries easy to read, diff, and back up independently of larger binary files.

### `templates/`

Holds reusable Markdown templates that can be used as a starting point for a new journal entry — for example, a template with pre-filled front matter fields and a suggested structure for a daily entry.

Templates are not journal entries themselves; they exist to make creating a new entry faster and more consistent, and are not expected to change as often as the entries in `journals/`.

## Creating a compatible repository manually

Someone assembling a content repository by hand needs only to:

1. Choose a location on disk for the repository.
2. Create the three directories listed above (`journals/`, `attachments/`, `templates/`) directly inside it.
3. Point `JOURNAL_CONTENT_ROOT` at that location.

At this point the repository is structurally compatible with the application. Populating `journals/` with entries, `attachments/` with files, or `templates/` with starting points is optional and can happen at any pace — an empty, correctly structured repository is already valid.

No further setup, initialization step, or tooling is required for the structure itself to be considered valid.
