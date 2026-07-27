"use server";

import { revalidatePath } from "next/cache";
import { journalRepository } from "../repository";
import type { JournalEntry } from "../types";
import { JOURNAL_LIST_PATH } from "./paths";

/**
 * Persists a new journal entry via the Journal Repository.
 *
 * The caller is responsible for constructing a complete, valid
 * JournalEntry — this action performs no business logic of its own
 * beyond invoking the repository and revalidating the journal list.
 * The new entry's own detail route is not revalidated: it has never
 * been rendered before, so there is nothing cached there to invalidate.
 */
export async function createJournal(entry: JournalEntry): Promise<void> {
    await journalRepository.createEntry(entry);

    revalidatePath(JOURNAL_LIST_PATH);
}
