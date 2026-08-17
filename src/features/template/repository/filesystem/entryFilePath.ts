import { join, relative, resolve } from "node:path";
import { isValidUuid } from "@/lib/validation";
import { getTemplatesDirectoryPath } from "@/lib/paths";
import { InvalidTemplateIdError } from "../../errors";

const TEMPLATE_FILE_EXTENSION = ".md";

/**
 * Returns the filesystem path of the Markdown file backing the template
 * with the given id. Each template is stored as exactly one file, named
 * after its id, directly inside the templates directory.
 *
 * Every caller routes through here, so validating the id and confirming
 * the resolved path stays inside the templates directory in this one
 * place protects every current and future caller from path traversal
 * (CWE-22) — a raw id (e.g. containing `../`) must never reach `join()`
 * unchecked.
 */
export function getTemplateFilePath(id: string): string {
    if (!isValidUuid(id)) {
        throw new InvalidTemplateIdError(id);
    }

    const templatesDirectory = resolve(getTemplatesDirectoryPath());
    const filePath = resolve(templatesDirectory, `${id}${TEMPLATE_FILE_EXTENSION}`);
    const relativePath = relative(templatesDirectory, filePath);

    if (relativePath.startsWith("..") || resolve(templatesDirectory, relativePath) !== filePath) {
        throw new InvalidTemplateIdError(id);
    }

    return join(templatesDirectory, `${id}${TEMPLATE_FILE_EXTENSION}`);
}
