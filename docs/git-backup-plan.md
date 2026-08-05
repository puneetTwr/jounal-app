# Plan: "Backup to Git" Button (Draft — for review, not yet implemented; open questions resolved)

## Goal

A button on the home page that snapshots the entire journal content repository (`JOURNAL_CONTENT_ROOT`) into Git, preserving its directory structure, and pushes that snapshot to a private remote you control — a manual, on-demand backup, triggered by you clicking a button.

## How this fits what's already decided

`ADR-001-local-first.md` already commits this project to treating the content root as its own Git repository, with GitHub-style remotes as an optional redundancy layer. That ADR's long-term vision is Git commits happening automatically as a side effect of every Save. This plan is deliberately a smaller, earlier slice of that vision: a manually-triggered "back up now" action, not an automatic commit-on-save workflow. Auto-commit-on-save is real future work, but a separate feature built on top of this one — not part of this iteration.

Today, `JOURNAL_CONTENT_ROOT` (currently `journals/`, `templates/`, `attachments/`) is **not yet a Git repository** and has no remote configured.

## Decisions confirmed with you

- **Commit + push**, not just a local commit — this is meant to be an actual off-machine backup.
- **App handles first-time setup automatically**: on first use, it runs `git init` in the content root if it isn't a repo yet, and wires up the remote from configuration. You provide the remote repo (a private repo you create yourself, e.g. on GitHub) via a new env var — the app never creates the remote repo itself.
- **Auth via a personal access token in an env var** (HTTPS push), not the host's existing SSH/credential setup.
- **File scope: everything under the content root** — journals, templates, *and* attachments (not just `.md` files as the original ask literally said). Confirmed: attachments are included.
- **New env vars, confirmed:** `JOURNAL_CONTENT_GIT_REMOTE_URL` and `JOURNAL_CONTENT_GIT_TOKEN` (already created).
- **Target branch: `main`.**
- **When Git backup isn't configured yet** (either env var missing): the button still renders — it isn't hidden — but clicking it (or the page, on load) surfaces a clear, explicit "Git backup isn't configured" state rather than a generic failure. Hiding the button entirely would look like the feature doesn't exist and make a misconfiguration harder to notice; a plain disabled-with-explanation state is more transparent and easier to debug later, consistent with how the rest of the app already surfaces configuration problems (e.g. `JOURNAL_CONTENT_ROOT` failing fast with a clear error rather than silently falling back).

## Flow

1. You click "Backup to Git" on the home page.
2. A new Server Action runs against `JOURNAL_CONTENT_ROOT`:
   - If `.git` doesn't exist yet in the content root, initialize it and add the configured remote.
   - Stage everything (`git add -A`) — new, modified, and deleted files alike; directory structure is preserved automatically since Git tracks full relative paths.
   - If nothing changed since the last backup, stop here and report "Nothing to back up."
   - Commit, with an auto-generated message (e.g. a timestamp) — not a user-typed message, since this is a one-click bulk action.
   - Push to `main` on the configured remote. If the push is rejected (e.g. the remote has commits this repo doesn't, which could happen if you ever edit the same content from a second machine), stop and surface that as an error — the app will **not** auto-force-push or auto-merge on your behalf.
3. The button shows a status (idle → backing up… → success / "nothing to back up" / error), the same pattern already used for the Save buttons elsewhere in the app.

## Key technical decisions

- **Shell out to the real `git` CLI** (via a thin wrapper library, not a from-scratch reimplementation, and not a pure-JS Git reimplementation like isomorphic-git). The app already runs as a normal Node.js process with full filesystem access, and `git` is confirmed available on this machine — there's no sandboxing constraint pushing toward a JS-only implementation, so leaning on the real, battle-tested `git` binary is simpler and more correct than reinventing any part of it.
- **New configuration**, alongside `JOURNAL_CONTENT_ROOT`: `JOURNAL_CONTENT_GIT_REMOTE_URL` and `JOURNAL_CONTENT_GIT_TOKEN`, both required for the button to function.
- **The token is never written to disk** (not persisted into the repo's `.git/config`, not embedded permanently in the remote URL) — it's read from the environment at push time only, so a leaked `.git/config` or repo copy can't leak the credential.
- **One commit per click**, covering every change since the last backup — not one commit per file.
- **No automatic conflict resolution.** A rejected push is surfaced as a plain error; resolving it (if it ever happens) is a manual, deliberate step, consistent with this being a single-user tool that shouldn't quietly rewrite history.

## Explicitly out of scope for this iteration

- Auto-committing on every journal/template save (that's the ADR's longer-term direction, but a distinct, later feature).
- The app creating the private remote repository itself (you provision it and hand over the URL).
- Any merge/conflict-resolution UI.
- Selective/partial backups (e.g. "just this entry") — this button always backs up the whole content root.

## Status

All open questions are resolved. This plan is ready to move into implementation pending your final go-ahead.
