import { join } from "node:path";
import { getJournalsDirectoryPath } from "@/lib/paths";

const JOURNAL_ENTRY_FILE_EXTENSION = ".md";

/**
 * Returns the filesystem path of the Markdown file backing the journal
 * entry with the given id. Each entry is stored as exactly one file,
 * named after its id, directly inside the journals directory.
 */
export function getJournalEntryFilePath(id: string): string {
    return join(getJournalsDirectoryPath(), `${id}${JOURNAL_ENTRY_FILE_EXTENSION}`);
}
