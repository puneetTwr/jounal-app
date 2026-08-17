import { fileExists } from "@/lib/filesystem";
import { loadMarkdownEntryFile } from "@/lib/markdown";
import { TemplateParseError } from "../../errors";
import { toTemplateEntry } from "../../mapper";
import type { TemplateEntry } from "../../types";
import { validateTemplateEntry } from "../../validation";
import { getTemplateFilePath } from "./entryFilePath";

/**
 * Returns the template with the given id, or null if no such template
 * exists on disk.
 *
 * Loading flow: Filesystem -> Markdown parser -> Mapper -> Validation.
 * A file that exists but fails validation throws TemplateParseError
 * rather than returning null, since that would hide corrupt data behind
 * an indistinguishable "not found" result.
 */
export async function getTemplate(id: string): Promise<TemplateEntry | null> {
    const filePath = getTemplateFilePath(id);

    if (!(await fileExists(filePath))) {
        return null;
    }

    return loadMarkdownEntryFile(
        filePath,
        toTemplateEntry,
        validateTemplateEntry,
        (path, issues) => new TemplateParseError(path, issues)
    );
}
