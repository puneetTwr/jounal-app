"use server";

import { journalService, type JournalSearchFilters } from "../services";
import type { JournalEntry } from "../types";

/**
 * Lists journal entries, optionally narrowed by search/filter criteria.
 * Read-only — no revalidation needed.
 */
export async function listJournals(filters?: JournalSearchFilters): Promise<JournalEntry[]> {
    return journalService.listJournals(filters);
}
