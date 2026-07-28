import { listMarkdownFilePaths, loadMarkdownEntryFile } from "@/lib/markdown";
import { getTemplatesDirectoryPath } from "@/lib/paths";
import { TemplateParseError } from "../errors";
import { toTemplateEntry } from "../mapper";
import type { TemplateEntry } from "../types";
import { validateTemplateEntry } from "../validation";

/**
 * Lists every template found in the templates directory.
 *
 * Loading flow per file: Filesystem -> Markdown parser -> Mapper ->
 * Validation. A file that fails validation is treated as corrupt data
 * and throws TemplateParseError rather than being silently skipped.
 */
export async function listTemplates(): Promise<TemplateEntry[]> {
    const templatesDirectory = getTemplatesDirectoryPath();
    const filePaths = await listMarkdownFilePaths(templatesDirectory);

    const entries: TemplateEntry[] = [];

    for (const filePath of filePaths) {
        entries.push(
            await loadMarkdownEntryFile(
                filePath,
                toTemplateEntry,
                validateTemplateEntry,
                (path, issues) => new TemplateParseError(path, issues)
            )
        );
    }

    return entries;
}
