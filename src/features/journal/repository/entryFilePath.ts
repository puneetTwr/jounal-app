import { join, relative, resolve } from "node:path";
import { isValidUuid } from "@/lib/validation";
import { getJournalsDirectoryPath } from "@/lib/paths";
import { InvalidJournalEntryIdError } from "../errors";

const JOURNAL_ENTRY_FILE_EXTENSION = ".md";

/**
 * Returns the filesystem path of the Markdown file backing the journal
 * entry with the given id. Each entry is stored as exactly one file,
 * named after its id, directly inside the journals directory.
 *
 * Every caller (getEntry, deleteEntry, createEntry, updateEntry) routes
 * through here, so validating the id and confirming the resolved path
 * stays inside the journals directory in this one place protects every
 * current and future caller from path traversal (CWE-22) — a raw id
 * (e.g. containing `../`) must never reach `join()` unchecked.
 */
export function getJournalEntryFilePath(id: string): string {
    if (!isValidUuid(id)) {
        throw new InvalidJournalEntryIdError(id);
    }

    const journalsDirectory = resolve(getJournalsDirectoryPath());
    const filePath = resolve(journalsDirectory, `${id}${JOURNAL_ENTRY_FILE_EXTENSION}`);
    const relativePath = relative(journalsDirectory, filePath);

    if (relativePath.startsWith("..") || resolve(journalsDirectory, relativePath) !== filePath) {
        throw new InvalidJournalEntryIdError(id);
    }

    return join(journalsDirectory, `${id}${JOURNAL_ENTRY_FILE_EXTENSION}`);
}
