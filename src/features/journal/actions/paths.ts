/**
 * Route paths that display journal data, used to scope
 * revalidatePath() calls after a mutation. Centralized here so that if
 * these routes are renamed, only this file needs to change.
 *
 * The journal list is rendered at the app root (see src/app/page.tsx).
 */
export const JOURNAL_LIST_PATH = "/";

/** Returns the detail route path for a single journal entry. */
export function getJournalDetailPath(id: string): string {
    return `/journal/${id}`;
}
