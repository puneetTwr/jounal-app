import { ensureDirectoryExists, fileExists, writeTextFile } from "@/lib/filesystem";
import { serializeMarkdownDocument } from "@/lib/markdown";
import { getJournalsDirectoryPath } from "@/lib/paths";
import { JournalEntryAlreadyExistsError, JournalValidationError } from "../../errors";
import { toMarkdownDocument } from "../../mapper";
import type { JournalEntry } from "../../types";
import { validateJournalEntry } from "../../validation";
import { getJournalEntryFilePath } from "./entryFilePath";

/**
 * Persists a new journal entry.
 *
 * Saving flow: Validation -> Mapper -> Markdown serializer ->
 * Filesystem. Throws JournalValidationError if the entry is invalid, or
 * JournalEntryAlreadyExistsError if an entry with the same id is
 * already on disk.
 */
export async function createEntry(entry: JournalEntry): Promise<void> {
    const result = validateJournalEntry(entry);

    if (!result.valid) {
        throw new JournalValidationError(result.issues);
    }

    const filePath = getJournalEntryFilePath(result.value.frontMatter.id);

    if (await fileExists(filePath)) {
        throw new JournalEntryAlreadyExistsError(result.value.frontMatter.id);
    }

    await ensureDirectoryExists(getJournalsDirectoryPath());

    const document = toMarkdownDocument(result.value);
    await writeTextFile(filePath, serializeMarkdownDocument(document));
}
