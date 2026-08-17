import { getGithubApiStorageConfig } from "@/lib/config";
import { getFileContent, GitHubConflictError, putFile } from "@/lib/githubApi";
import { serializeMarkdownDocument } from "@/lib/markdown";
import { JournalEntryNotFoundError, JournalValidationError } from "../../errors";
import { toMarkdownDocument } from "../../mapper";
import type { JournalEntry } from "../../types";
import { validateJournalEntry } from "../../validation";
import { getJournalEntryPath } from "./entryPath";

/**
 * Overwrites an existing journal entry as a new commit.
 *
 * Retries once on GitHubConflictError (the file's blob sha changed since
 * it was read — e.g. an edit from another device landed in between):
 * refetch the current sha and reapply the write. A second conflict is
 * treated as a real concurrent edit and surfaced to the caller rather
 * than retried indefinitely or silently overwritten — see ADR-002.
 */
export async function updateEntry(entry: JournalEntry): Promise<void> {
    const result = validateJournalEntry(entry);

    if (!result.valid) {
        throw new JournalValidationError(result.issues);
    }

    const path = getJournalEntryPath(result.value.frontMatter.id);
    const config = getGithubApiStorageConfig();
    const message = `Update journal entry: ${result.value.frontMatter.title}`;
    const serialized = serializeMarkdownDocument(toMarkdownDocument(result.value));

    const current = await getFileContent(config, path);
    if (!current) {
        throw new JournalEntryNotFoundError(result.value.frontMatter.id);
    }

    try {
        await putFile(config, path, serialized, message, current.sha);
    } catch (error) {
        if (!(error instanceof GitHubConflictError)) {
            throw error;
        }

        const retryTarget = await getFileContent(config, path);
        if (!retryTarget) {
            throw new JournalEntryNotFoundError(result.value.frontMatter.id);
        }

        await putFile(config, path, serialized, message, retryTarget.sha);
    }
}
