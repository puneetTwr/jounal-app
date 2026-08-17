import { getGithubApiStorageConfig } from "@/lib/config";
import { deleteFile, getFileContent, GitHubConflictError } from "@/lib/githubApi";
import { JournalEntryNotFoundError } from "../../errors";
import { getJournalEntryPath } from "./entryPath";

/**
 * Deletes the journal entry with the given id as a new commit. Retries
 * once on GitHubConflictError (a stale sha), same reasoning as
 * updateEntry().
 */
export async function deleteEntry(id: string): Promise<void> {
    const path = getJournalEntryPath(id);
    const config = getGithubApiStorageConfig();
    const message = `Delete journal entry: ${id}`;

    const current = await getFileContent(config, path);
    if (!current) {
        throw new JournalEntryNotFoundError(id);
    }

    try {
        await deleteFile(config, path, message, current.sha);
    } catch (error) {
        if (!(error instanceof GitHubConflictError)) {
            throw error;
        }

        const retryTarget = await getFileContent(config, path);
        if (!retryTarget) {
            throw new JournalEntryNotFoundError(id);
        }

        await deleteFile(config, path, message, retryTarget.sha);
    }
}
