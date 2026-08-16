"use server";

import { assertAuthenticated } from "@/lib/auth";
import { journalService } from "../services";
import type { JournalEntry } from "../types";

/**
 * Returns the journal entry with the given id, or null if none exists.
 * Read-only — no revalidation needed.
 */
export async function getJournal(id: string): Promise<JournalEntry | null> {
    await assertAuthenticated();

    return journalService.getJournal(id);
}
