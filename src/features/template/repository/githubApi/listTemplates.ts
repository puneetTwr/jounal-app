import { getGithubApiStorageConfig } from "@/lib/config";
import { getBlob, getTree } from "@/lib/githubApi";
import { mapMarkdownContent } from "@/lib/markdown";
import { TemplateParseError } from "../../errors";
import { toTemplateEntry } from "../../mapper";
import type { TemplateEntry } from "../../types";
import { validateTemplateEntry } from "../../validation";

const TEMPLATES_DIRECTORY = "templates";

/**
 * Lists every template in the content repository: one Git Data API tree
 * call to enumerate every file under `templates/`, then one blob fetch
 * per file — the GitHub API adapter's equivalent of the filesystem
 * adapter's "list the directory, read every file" pass.
 */
export async function listTemplates(): Promise<TemplateEntry[]> {
    const config = getGithubApiStorageConfig();
    const files = await getTree(config, TEMPLATES_DIRECTORY);

    const entries: TemplateEntry[] = [];

    for (const file of files) {
        const content = await getBlob(config, file.sha);
        entries.push(
            mapMarkdownContent(
                content,
                file.path,
                toTemplateEntry,
                validateTemplateEntry,
                (source, issues) => new TemplateParseError(source, issues)
            )
        );
    }

    return entries;
}
