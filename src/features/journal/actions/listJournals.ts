"use server";

import { journalService } from "../services";
import type { JournalEntry } from "../types";

/**
 * Lists every journal entry. Read-only — no revalidation needed.
 */
export async function listJournals(): Promise<JournalEntry[]> {
    return journalService.listJournals();
}
