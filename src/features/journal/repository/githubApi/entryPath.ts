import { isValidUuid } from "@/lib/validation";
import { InvalidJournalEntryIdError } from "../../errors";

const JOURNALS_DIRECTORY = "journals";
const JOURNAL_ENTRY_FILE_EXTENSION = ".md";

/**
 * Returns the content-repository path of the Markdown file backing the
 * journal entry with the given id — the GitHub API adapter's equivalent
 * of the filesystem adapter's getJournalEntryFilePath(): one file per
 * entry, named after its id, directly inside `journals/`.
 *
 * Validates `id` as a UUID before building the path for the same reason
 * the filesystem adapter validates before calling `join()`: an
 * unchecked id could otherwise be crafted to address a path outside
 * `journals/` in the target repository (e.g. via `../`).
 */
export function getJournalEntryPath(id: string): string {
    if (!isValidUuid(id)) {
        throw new InvalidJournalEntryIdError(id);
    }

    return `${JOURNALS_DIRECTORY}/${id}${JOURNAL_ENTRY_FILE_EXTENSION}`;
}
