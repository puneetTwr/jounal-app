"use server";

import { assertAuthenticated } from "@/lib/auth";
import { journalService, type JournalSearchFilters } from "../services";
import type { JournalEntry } from "../types";

/**
 * Lists journal entries, optionally narrowed by search/filter criteria.
 * Read-only — no revalidation needed.
 */
export async function listJournals(filters?: JournalSearchFilters): Promise<JournalEntry[]> {
    await assertAuthenticated();

    return journalService.listJournals(filters);
}
