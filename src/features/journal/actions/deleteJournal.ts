"use server";

import { revalidatePath } from "next/cache";
import { assertAuthenticated } from "@/lib/auth";
import { journalService } from "../services";
import { JOURNAL_LIST_PATH, getJournalDetailPath } from "./paths";

/**
 * Deletes a journal entry via the Journal Service. Revalidates the
 * journal list and the deleted entry's own detail route, so a
 * previously cached view of the now-deleted entry does not linger.
 */
export async function deleteJournal(id: string): Promise<void> {
    await assertAuthenticated();
    await journalService.deleteJournal(id);

    revalidatePath(JOURNAL_LIST_PATH);
    revalidatePath(getJournalDetailPath(id));
}
