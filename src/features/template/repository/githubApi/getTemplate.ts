import { getGithubApiStorageConfig } from "@/lib/config";
import { getFileContent } from "@/lib/githubApi";
import { mapMarkdownContent } from "@/lib/markdown";
import { TemplateParseError } from "../../errors";
import { toTemplateEntry } from "../../mapper";
import type { TemplateEntry } from "../../types";
import { validateTemplateEntry } from "../../validation";
import { getTemplatePath } from "./entryPath";

/**
 * Returns the template with the given id, or null if no such template
 * exists in the content repository.
 *
 * Loading flow: GitHub Contents API -> Markdown parser -> Mapper ->
 * Validation — the same pipeline the filesystem adapter uses, with the
 * read source swapped from local disk to GitHub's API.
 */
export async function getTemplate(id: string): Promise<TemplateEntry | null> {
    const path = getTemplatePath(id);
    const file = await getFileContent(getGithubApiStorageConfig(), path);

    if (!file) {
        return null;
    }

    return mapMarkdownContent(
        file.content,
        path,
        toTemplateEntry,
        validateTemplateEntry,
        (source, issues) => new TemplateParseError(source, issues)
    );
}
