import { isValidUuid } from "@/lib/validation";
import { InvalidTemplateIdError } from "../../errors";

const TEMPLATES_DIRECTORY = "templates";
const TEMPLATE_FILE_EXTENSION = ".md";

/**
 * Returns the content-repository path of the Markdown file backing the
 * template with the given id — the GitHub API adapter's equivalent of
 * the filesystem adapter's getTemplateFilePath(): one file per template,
 * named after its id, directly inside `templates/`.
 *
 * Validates `id` as a UUID for the same path-traversal reason the
 * filesystem adapter validates before calling `join()`.
 */
export function getTemplatePath(id: string): string {
    if (!isValidUuid(id)) {
        throw new InvalidTemplateIdError(id);
    }

    return `${TEMPLATES_DIRECTORY}/${id}${TEMPLATE_FILE_EXTENSION}`;
}
