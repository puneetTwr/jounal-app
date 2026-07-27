import { fileExists, readTextFile } from "@/lib/filesystem";
import { parseMarkdownDocument } from "@/lib/markdown";
import { JournalEntryParseError } from "../errors";
import { toJournalEntry } from "../mapper";
import type { JournalEntry } from "../types";
import { validateJournalEntry } from "../validation";
import { getJournalEntryFilePath } from "./entryFilePath";

/**
 * Returns the journal entry with the given id, or null if no such entry
 * exists on disk.
 *
 * Loading flow: Filesystem -> Markdown parser -> Mapper -> Validation.
 * A file that exists but fails validation throws JournalEntryParseError
 * rather than returning null, since that would hide corrupt data behind
 * an indistinguishable "not found" result.
 */
export async function getEntry(id: string): Promise<JournalEntry | null> {
    const filePath = getJournalEntryFilePath(id);

    if (!(await fileExists(filePath))) {
        return null;
    }

    const rawContents = await readTextFile(filePath);
    const document = parseMarkdownDocument(rawContents);
    const mapped = toJournalEntry(document);
    const result = validateJournalEntry(mapped);

    if (!result.valid) {
        throw new JournalEntryParseError(filePath, result.issues);
    }

    return result.value;
}
