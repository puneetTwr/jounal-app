/**
 * Route paths that display journal data, used to scope
 * revalidatePath() calls after a mutation. Centralized here so that if
 * these routes are renamed, only this file needs to change.
 *
 * ASSUMPTION: no page currently reads journal data — the only existing
 * route is the static placeholder at "/" (see src/app/page.tsx). These
 * paths anticipate the conventional routes a future journal UI
 * milestone will introduce ("/journal" as the list, "/journal/[id]" as
 * an entry's detail view) and should be revisited, and renamed here if
 * needed, once that UI actually exists.
 */
export const JOURNAL_LIST_PATH = "/journal";

/** Returns the detail route path for a single journal entry. */
export function getJournalDetailPath(id: string): string {
    return `${JOURNAL_LIST_PATH}/${id}`;
}
