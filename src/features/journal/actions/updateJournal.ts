"use server";

import { revalidatePath } from "next/cache";
import { assertAuthenticated } from "@/lib/auth";
import { journalService } from "../services";
import type { JournalEntry } from "../types";
import { JOURNAL_LIST_PATH, getJournalDetailPath } from "./paths";

/**
 * Overwrites an existing journal entry via the Journal Service.
 * Revalidates both the journal list (its summary of this entry may have
 * changed) and this entry's own detail route.
 */
export async function updateJournal(entry: JournalEntry): Promise<void> {
    await assertAuthenticated();
    await journalService.updateJournal(entry);

    revalidatePath(JOURNAL_LIST_PATH);
    revalidatePath(getJournalDetailPath(entry.frontMatter.id));
}
