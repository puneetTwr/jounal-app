import { listFilesRecursively, readTextFile } from "@/lib/filesystem";
import { parseMarkdownDocument } from "@/lib/markdown";
import { getJournalsDirectoryPath } from "@/lib/paths";
import { JournalEntryParseError } from "../errors";
import { toJournalEntry } from "../mapper";
import type { JournalEntry } from "../types";
import { validateJournalEntry } from "../validation";

const MARKDOWN_FILE_EXTENSION = ".md";

/**
 * Lists every journal entry found in the journals directory.
 *
 * Loading flow per file: Filesystem -> Markdown parser -> Mapper ->
 * Validation. A file that fails validation is treated as corrupt data
 * and throws JournalEntryParseError rather than being silently skipped.
 */
export async function listEntries(): Promise<JournalEntry[]> {
    const journalsDirectory = getJournalsDirectoryPath();
    const filePaths = await listFilesRecursively(journalsDirectory);
    const entryFilePaths = filePaths.filter((filePath) => filePath.endsWith(MARKDOWN_FILE_EXTENSION));

    const entries: JournalEntry[] = [];

    for (const filePath of entryFilePaths) {
        const rawContents = await readTextFile(filePath);
        const document = parseMarkdownDocument(rawContents);
        const mapped = toJournalEntry(document);
        const result = validateJournalEntry(mapped);

        if (!result.valid) {
            throw new JournalEntryParseError(filePath, result.issues);
        }

        entries.push(result.value);
    }

    return entries;
}
