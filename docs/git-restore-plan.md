# Plan: "Restore from Git" (Draft — for review, not yet implemented)

## Goal

A second button, alongside "Backup to Git," that pulls the content root's Git history down from the remote and merges it into the local working tree — recovering journals/templates/attachments that exist in the remote repo but not locally (empty machine, wiped directory, etc.), and more generally keeping local in sync with whatever's been backed up.

Yes, this is possible, and it reuses almost everything the backup feature already set up (remote config, auth, the content root's Git repo). The interesting part isn't "can we pull" — it's what happens when local isn't actually empty and might conflict with what's incoming. That's the bulk of this plan.

## Decisions confirmed with you

- **Restore is always available**, not gated to "only when local is empty" — a general pull/sync action, usable any time.
- **Handles both cases**: no local `.git` yet (brand-new machine) and a local `.git` that already exists but lost its working-tree files. One flow covers both (explained below — it turns out both are literally the same code path).
- **A separate "Restore from Git" button**, not a combined smart-sync button. Backup always pushes, Restore always pulls.
- **A confirmation dialog before restoring**, since it can change local files — same pattern as the existing delete-journal confirmation.

Because restore is "always available" rather than empty-only, it has to account for local files that already exist and might differ from the remote — that's a real merge, not just a download. The rest of this plan is about doing that safely.

## Proposed flow

One unified algorithm, regardless of whether this is a first-time bootstrap or a later re-sync:

1. You click "Restore from Git," confirm in the dialog.
2. If `.git` doesn't exist yet in the content root, initialize it (`git init -b main`) and wire up the configured remote — identical to what Backup already does on first use.
3. **Safety commit.** If there are any uncommitted local changes (new/edited/deleted files since the last backup), stage and commit them locally right now, with an auto message like `Pre-restore snapshot: <timestamp>`. This commit is **not pushed** — it just means nothing currently on disk is ever silently discarded by the next step; it becomes a normal part of local history instead.
4. `git fetch origin`.
5. `git merge origin/main` (with `--allow-unrelated-histories`, needed if this machine's local repo and the remote were never related — e.g. Backup ran here once before Restore was ever used).
   - If local had nothing new (the common "empty workspace" case), this is a plain fast-forward: local simply catches up to everything in the remote. This also transparently covers the "brand-new machine, no `.git` at all" case — merging into a repo with zero commits yet behaves as a fast-forward, so no separate "clone" logic is needed.
   - If local had new changes (from step 3) that don't overlap with what's incoming, Git merges them automatically — no conflict.
   - If the *same file* was changed in conflicting ways in both places, Git can't auto-resolve it. See "Handling conflicts" below.
6. Report the outcome: success (optionally "N files updated"), or a clear error if step 5 hit a conflict.

## Handling conflicts (the part you asked me to think through)

This app has no in-app merge-conflict resolution UI, and a real conflict leaves a Markdown file containing raw `<<<<<<< / ======= / >>>>>>>` marker text — which would also break this app's own front-matter/Markdown parser everywhere else that file is read (the journal list, the detail page, search). That's a worse failure than just "the restore didn't work" — it's "the app is now broken until someone fixes this file by hand."

So the proposed rule: **if `git merge` reports a conflict, immediately run `git merge --abort` and report a plain error** ("Restore couldn't complete automatically — the same file changed in both places. Resolve it with a Git client outside the app, then try again."). Nothing conflicted is ever left sitting in the working tree; local state after a failed restore is exactly what it was before you clicked the button (plus the harmless local safety commit from step 3). This mirrors the same philosophy already used for Backup's rejected-push case: stop and surface the problem, never auto-resolve, never leave things half-done.

This is also a known, accepted trade-off for this whole architecture, not a new one — `docs/architecture/ADR-001-local-first.md` already calls out "Markdown files with overlapping edits can still require manual resolution" as an accepted limitation of using Git as the version history mechanism.

**In practice, conflicts should be rare.** A conflict requires the exact same file to have been changed in two different, un-synced places (e.g. editing the same journal entry from two machines without restoring in between). For the scenario you described — an empty local workspace pulling down what's already in the remote — step 5 is always a clean fast-forward. Conflicts only become possible once there's real, divergent editing history across machines.

## Interaction with "Backup to Git"

- **They share the same content-root Git repository**, so only one should run at a time. Proposed: a simple in-process lock — if a Backup or Restore is already running, the other button is disabled with "another Git operation is already in progress" until it finishes. Without this, two operations racing against the same working tree/index at once could corrupt it.
- **Restore never pushes.** Any commits it creates (the safety-commit from step 3, or a merge commit) stay local until you separately click Backup. This keeps the two buttons' responsibilities clean: Restore only ever pulls things in; Backup is the only thing that ever pushes.
- **Restore actually fixes a failure mode Backup already has.** Today, if Backup's push is ever rejected because the remote has commits the local repo doesn't (e.g. you edited from a second machine), Backup just reports an error and stops — there's currently no way to resolve that from the UI. Restore is exactly the fix: run it to bring local up to date with the remote, then Backup will push cleanly again.
- **No conflicting writes during normal use**, because Backup's own step ("stage everything, commit, push") and Restore's ("safety-commit anything local, fetch, merge") never run simultaneously (see the lock above), and Restore always leaves local in a clean, mergeable, or clearly-errored state — never a half-merged one.

## Key technical decisions

- **Reuses Backup's existing plumbing**: same `JOURNAL_CONTENT_GIT_REMOTE_URL` / `JOURNAL_CONTENT_GIT_TOKEN`, same "ensure `.git` exists, ensure `origin` is configured" step, same non-persisted, env-var-scoped auth approach for the `fetch` (mirroring how `pushToRemote` already avoids writing the token to disk).
- **One unified flow**, not two separate "clone" vs. "already a repo" code paths — merging into an empty/unborn `main` branch already behaves as a fast-forward, so the fresh-machine case and the re-sync case fall out of the same logic for free.
- **Never auto-resolve conflicts, never leave a half-merged working tree** — abort and surface a plain error instead, consistent with Backup's existing "no auto-force-push" stance.
- **Restore never pushes** — pushing stays exclusively Backup's job.
- **A shared in-process lock** between Backup and Restore, so the two features can never run concurrently against the same repo.

## Assumptions worth flagging

- If the remote repository is entirely empty (nothing has ever been backed up), restoring naturally does nothing — there's nothing to fast-forward to. That's expected, not an error.
- If the remote repo only ever contained, say, journal entries and never any templates or attachments (because those directories were empty at every past backup), a restore won't recreate empty `templates/`/`attachments/` directories — Git doesn't track empty directories. This is a pre-existing characteristic of the content root's structure, not something this feature changes, but worth knowing so an apparently "incomplete" restore isn't mistaken for a bug.
- Both features assume a single person operating from (usually) one machine at a time, per ADR-001 — this plan does not attempt to support real-time multi-machine collaboration, just occasional re-sync between sessions.

## Explicitly out of scope for this iteration

- Any in-app UI for resolving merge conflicts (viewing/editing conflict markers, choosing "ours"/"theirs," etc.) — conflicts are surfaced as an error and resolved manually, outside the app, if they ever occur.
- Automatic/background restore (e.g. checking on every app startup) — this is a manual, on-demand button, matching Backup.
- Any attempt to recover the "pre-restore safety commit" through the UI — it's just a normal local Git commit, inspectable via a Git client if ever needed, but this app won't grow a history browser as part of this feature.

## Open question for you

The safety-commit-before-merge step means a Restore can leave local commits that were never pushed (your snapshot, or a real merge commit). Should the button's success message mention this explicitly (e.g. "Restored — click Backup to push these changes"), or is a plain "Restored" sufficient and you'll remember to back up afterward yourself?
