import { join } from "node:path";
import { getContentRootPath } from "./getContentRootPath";
import { TEMPLATES_DIRECTORY_NAME } from "./constants";

/** Returns the path to the templates directory within the content root. */
export function getTemplatesDirectoryPath(): string {
    return join(getContentRootPath(), TEMPLATES_DIRECTORY_NAME);
}
