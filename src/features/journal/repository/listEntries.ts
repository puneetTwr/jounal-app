import { listMarkdownFilePaths, loadMarkdownEntryFile } from "@/lib/markdown";
import { getJournalsDirectoryPath } from "@/lib/paths";
import { JournalEntryParseError } from "../errors";
import { toJournalEntry } from "../mapper";
import type { JournalEntry } from "../types";
import { validateJournalEntry } from "../validation";

/**
 * Lists every journal entry found in the journals directory.
 *
 * Loading flow per file: Filesystem -> Markdown parser -> Mapper ->
 * Validation. A file that fails validation is treated as corrupt data
 * and throws JournalEntryParseError rather than being silently skipped.
 */
export async function listEntries(): Promise<JournalEntry[]> {
    const journalsDirectory = getJournalsDirectoryPath();
    const filePaths = await listMarkdownFilePaths(journalsDirectory);

    const entries: JournalEntry[] = [];

    for (const filePath of filePaths) {
        entries.push(
            await loadMarkdownEntryFile(
                filePath,
                toJournalEntry,
                validateJournalEntry,
                (path, issues) => new JournalEntryParseError(path, issues)
            )
        );
    }

    return entries;
}
