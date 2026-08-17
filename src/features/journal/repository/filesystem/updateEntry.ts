import { fileExists, writeTextFile } from "@/lib/filesystem";
import { serializeMarkdownDocument } from "@/lib/markdown";
import { JournalEntryNotFoundError, JournalValidationError } from "../../errors";
import { toMarkdownDocument } from "../../mapper";
import type { JournalEntry } from "../../types";
import { validateJournalEntry } from "../../validation";
import { getJournalEntryFilePath } from "./entryFilePath";

/**
 * Overwrites an existing journal entry.
 *
 * Saving flow: Validation -> Mapper -> Markdown serializer ->
 * Filesystem. Throws JournalValidationError if the entry is invalid, or
 * JournalEntryNotFoundError if no entry with that id exists yet —
 * callers that want create-or-update semantics should use createEntry()
 * for the initial write.
 */
export async function updateEntry(entry: JournalEntry): Promise<void> {
    const result = validateJournalEntry(entry);

    if (!result.valid) {
        throw new JournalValidationError(result.issues);
    }

    const filePath = getJournalEntryFilePath(result.value.frontMatter.id);

    if (!(await fileExists(filePath))) {
        throw new JournalEntryNotFoundError(result.value.frontMatter.id);
    }

    const document = toMarkdownDocument(result.value);
    await writeTextFile(filePath, serializeMarkdownDocument(document));
}
