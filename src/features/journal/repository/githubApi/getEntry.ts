import { getGithubApiStorageConfig } from "@/lib/config";
import { getFileContent } from "@/lib/githubApi";
import { mapMarkdownContent } from "@/lib/markdown";
import { JournalEntryParseError } from "../../errors";
import { toJournalEntry } from "../../mapper";
import type { JournalEntry } from "../../types";
import { validateJournalEntry } from "../../validation";
import { getJournalEntryPath } from "./entryPath";

/**
 * Returns the journal entry with the given id, or null if no such entry
 * exists in the content repository.
 *
 * Loading flow: GitHub Contents API -> Markdown parser -> Mapper ->
 * Validation — the same pipeline the filesystem adapter uses, with the
 * read source swapped from local disk to GitHub's API.
 */
export async function getEntry(id: string): Promise<JournalEntry | null> {
    const path = getJournalEntryPath(id);
    const file = await getFileContent(getGithubApiStorageConfig(), path);

    if (!file) {
        return null;
    }

    return mapMarkdownContent(
        file.content,
        path,
        toJournalEntry,
        validateJournalEntry,
        (source, issues) => new JournalEntryParseError(source, issues)
    );
}
