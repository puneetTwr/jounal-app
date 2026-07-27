"use server";

import { journalRepository } from "../repository";
import type { JournalEntry } from "../types";

/**
 * Returns the journal entry with the given id, or null if none exists.
 * Read-only — no revalidation needed.
 */
export async function getJournal(id: string): Promise<JournalEntry | null> {
    return journalRepository.getEntry(id);
}
