"use server";

import { revalidatePath } from "next/cache";
import { journalRepository } from "../repository";
import { JOURNAL_LIST_PATH, getJournalDetailPath } from "./paths";

/**
 * Deletes a journal entry via the Journal Repository. Revalidates the
 * journal list and the deleted entry's own detail route, so a
 * previously cached view of the now-deleted entry does not linger.
 */
export async function deleteJournal(id: string): Promise<void> {
    await journalRepository.deleteEntry(id);

    revalidatePath(JOURNAL_LIST_PATH);
    revalidatePath(getJournalDetailPath(id));
}
