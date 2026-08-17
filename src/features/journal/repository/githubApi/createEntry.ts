import { getGithubApiStorageConfig } from "@/lib/config";
import { getFileContent, putFile } from "@/lib/githubApi";
import { serializeMarkdownDocument } from "@/lib/markdown";
import { JournalEntryAlreadyExistsError, JournalValidationError } from "../../errors";
import { toMarkdownDocument } from "../../mapper";
import type { JournalEntry } from "../../types";
import { validateJournalEntry } from "../../validation";
import { getJournalEntryPath } from "./entryPath";

/**
 * Persists a new journal entry as a new commit on the configured branch.
 *
 * Saving flow: Validation -> Mapper -> Markdown serializer -> GitHub
 * Contents API — the same pipeline as the filesystem adapter, writing
 * through GitHub's API instead of `node:fs`. Existence is checked
 * explicitly (rather than relying on GitHub rejecting a sha-less write
 * to an existing path) so a collision surfaces as the same
 * JournalEntryAlreadyExistsError the filesystem adapter throws, not a
 * generic conflict.
 */
export async function createEntry(entry: JournalEntry): Promise<void> {
    const result = validateJournalEntry(entry);

    if (!result.valid) {
        throw new JournalValidationError(result.issues);
    }

    const path = getJournalEntryPath(result.value.frontMatter.id);
    const config = getGithubApiStorageConfig();

    if (await getFileContent(config, path)) {
        throw new JournalEntryAlreadyExistsError(result.value.frontMatter.id);
    }

    const document = toMarkdownDocument(result.value);
    await putFile(
        config,
        path,
        serializeMarkdownDocument(document),
        `Create journal entry: ${result.value.frontMatter.title}`
    );
}
