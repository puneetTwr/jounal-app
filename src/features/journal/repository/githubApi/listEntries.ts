import { getGithubApiStorageConfig } from "@/lib/config";
import { getBlob, getTree } from "@/lib/githubApi";
import { mapMarkdownContent } from "@/lib/markdown";
import { JournalEntryParseError } from "../../errors";
import { toJournalEntry } from "../../mapper";
import type { JournalEntry } from "../../types";
import { validateJournalEntry } from "../../validation";

const JOURNALS_DIRECTORY = "journals";

/**
 * Lists every journal entry in the content repository: one Git Data API
 * tree call to enumerate every file under `journals/`, then one blob
 * fetch per file — the GitHub API adapter's equivalent of the
 * filesystem adapter's "list the directory, read every file" pass.
 *
 * A file that fails validation is treated as corrupt data and throws
 * JournalEntryParseError, same as the filesystem adapter.
 */
export async function listEntries(): Promise<JournalEntry[]> {
    const config = getGithubApiStorageConfig();
    const files = await getTree(config, JOURNALS_DIRECTORY);

    const entries: JournalEntry[] = [];

    for (const file of files) {
        const content = await getBlob(config, file.sha);
        entries.push(
            mapMarkdownContent(
                content,
                file.path,
                toJournalEntry,
                validateJournalEntry,
                (source, issues) => new JournalEntryParseError(source, issues)
            )
        );
    }

    return entries;
}
