"use server";

import { revalidatePath } from "next/cache";
import { journalRepository } from "../repository";
import type { JournalEntry } from "../types";
import { JOURNAL_LIST_PATH, getJournalDetailPath } from "./paths";

/**
 * Overwrites an existing journal entry via the Journal Repository.
 * Revalidates both the journal list (its summary of this entry may have
 * changed) and this entry's own detail route.
 */
export async function updateJournal(entry: JournalEntry): Promise<void> {
    await journalRepository.updateEntry(entry);

    revalidatePath(JOURNAL_LIST_PATH);
    revalidatePath(getJournalDetailPath(entry.frontMatter.id));
}
