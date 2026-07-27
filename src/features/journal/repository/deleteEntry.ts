import { deleteFile, fileExists } from "@/lib/filesystem";
import { JournalEntryNotFoundError } from "../errors";
import { getJournalEntryFilePath } from "./entryFilePath";

/**
 * Deletes the journal entry with the given id.
 * Throws JournalEntryNotFoundError if no such entry exists.
 */
export async function deleteEntry(id: string): Promise<void> {
    const filePath = getJournalEntryFilePath(id);

    if (!(await fileExists(filePath))) {
        throw new JournalEntryNotFoundError(id);
    }

    await deleteFile(filePath);
}
