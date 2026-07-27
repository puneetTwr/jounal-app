/**
 * Route paths that display journal data, used to scope
 * revalidatePath() calls after a mutation. Centralized here so that if
 * these routes are renamed, only this file needs to change.
 *
 * The journal list is rendered at the app root (see src/app/page.tsx).
 * There is no journal detail route yet — getJournalDetailPath() below
 * anticipates one for a future milestone; nothing currently navigates
 * to the path it returns.
 */
export const JOURNAL_LIST_PATH = "/";

/** Returns the detail route path for a single journal entry, once one exists. */
export function getJournalDetailPath(id: string): string {
    return `/journal/${id}`;
}
