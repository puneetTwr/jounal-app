"use server";

import type { JournalEntry } from "../types";
import { getJournal } from "./getJournal";
import { updateJournal } from "./updateJournal";

export interface UpdateJournalContentResult {
    status: "success" | "error";
    error?: string;
}

/**
 * Server Action backing the Markdown body editor's Save button.
 *
 * Does not introduce a new persistence path: it fetches the entry's
 * current state via the existing getJournal action, merges in the
 * edited body plus a refreshed updatedAt, then calls the existing
 * updateJournal action — which already goes through JournalService and
 * JournalRepository unchanged, and already revalidates the journal
 * list and this entry's detail route. Only `content` is ever replaced;
 * every other front matter field (title, tags, journalDate, favorite,
 * pinned, archived) passes through untouched, which is why metadata
 * editing (a later milestone) requires no changes here.
 *
 * Every failure — the entry vanishing between load and save, or any
 * other repository/filesystem error — collapses to one generic
 * message; internal error details are never returned to the caller.
 */
export async function updateJournalContent(
    id: string,
    content: string
): Promise<UpdateJournalContentResult> {
    try {
        const existing = await getJournal(id);

        if (!existing) {
            return { status: "error", error: "This journal entry no longer exists." };
        }

        const updatedEntry: JournalEntry = {
            frontMatter: {
                ...existing.frontMatter,
                updatedAt: new Date().toISOString(),
            },
            content,
        };

        await updateJournal(updatedEntry);

        return { status: "success" };
    } catch {
        return {
            status: "error",
            error: "Something went wrong while saving. Please try again.",
        };
    }
}
