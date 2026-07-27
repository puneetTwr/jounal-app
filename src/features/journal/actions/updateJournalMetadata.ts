"use server";

import { JournalValidationError } from "../errors";
import type { JournalEntry, JournalFrontMatter } from "../types";
import { getJournal } from "./getJournal";
import { updateJournal } from "./updateJournal";

/**
 * Editable metadata fields, tied directly to JournalFrontMatter via
 * Pick so this input shape can never drift out of sync with the
 * domain type. `id` is added separately since it identifies which
 * entry to update rather than a value being changed.
 */
export type UpdateJournalMetadataInput = {
    id: string;
} & Pick<JournalFrontMatter, "title" | "journalDate" | "tags" | "favorite" | "pinned" | "archived">;

export interface UpdateJournalMetadataErrors {
    title?: string;
    journalDate?: string;
    form?: string;
}

export interface UpdateJournalMetadataResult {
    status: "success" | "error";
    errors?: UpdateJournalMetadataErrors;
}

/**
 * Server Action backing the metadata panel's Save button.
 *
 * Introduces no new persistence path: it fetches the entry's current
 * state via the existing getJournal action, merges in the edited
 * metadata fields plus a refreshed updatedAt, and calls the existing
 * updateJournal action — which already goes through JournalService and
 * JournalRepository unchanged, and already revalidates the affected
 * routes. `content` (the Markdown body) and every immutable field
 * (id, version, createdAt) pass through completely untouched.
 *
 * Only title/journalDate presence is checked here, mirroring
 * createJournal's Server Action. Every deeper rule — tag format,
 * uniqueness, ISO date shape, and so on — is enforced exactly once, by
 * the existing validateJournalFrontMatter/validateJournalEntry inside
 * the Repository, not reimplemented here.
 */
export async function updateJournalMetadata(
    input: UpdateJournalMetadataInput
): Promise<UpdateJournalMetadataResult> {
    const title = input.title.trim();
    const journalDate = input.journalDate.trim();

    const errors: UpdateJournalMetadataErrors = {};

    if (title.length === 0) {
        errors.title = "Title is required.";
    }
    if (journalDate.length === 0) {
        errors.journalDate = "Journal date is required.";
    }

    if (Object.keys(errors).length > 0) {
        return { status: "error", errors };
    }

    try {
        const existing = await getJournal(input.id);

        if (!existing) {
            return { status: "error", errors: { form: "This journal entry no longer exists." } };
        }

        const updatedFrontMatter: JournalFrontMatter = {
            ...existing.frontMatter,
            title,
            journalDate,
            tags: input.tags,
            favorite: input.favorite,
            pinned: input.pinned,
            archived: input.archived,
            updatedAt: new Date().toISOString(),
        };

        const updatedEntry: JournalEntry = {
            frontMatter: updatedFrontMatter,
            content: existing.content,
        };

        await updateJournal(updatedEntry);

        return { status: "success" };
    } catch (error) {
        if (error instanceof JournalValidationError) {
            return {
                status: "error",
                errors: { form: "Some of that metadata doesn't look valid. Please check it and try again." },
            };
        }

        return {
            status: "error",
            errors: { form: "Something went wrong while saving. Please try again." },
        };
    }
}
