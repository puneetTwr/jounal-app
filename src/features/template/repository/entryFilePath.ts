import { join } from "node:path";
import { getTemplatesDirectoryPath } from "@/lib/paths";

const TEMPLATE_FILE_EXTENSION = ".md";

/**
 * Returns the filesystem path of the Markdown file backing the template
 * with the given id. Each template is stored as exactly one file, named
 * after its id, directly inside the templates directory.
 */
export function getTemplateFilePath(id: string): string {
    return join(getTemplatesDirectoryPath(), `${id}${TEMPLATE_FILE_EXTENSION}`);
}
