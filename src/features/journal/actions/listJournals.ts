"use server";

import { journalRepository } from "../repository";
import type { JournalEntry } from "../types";

/**
 * Lists every journal entry. Read-only — no revalidation needed.
 */
export async function listJournals(): Promise<JournalEntry[]> {
    return journalRepository.listEntries();
}
