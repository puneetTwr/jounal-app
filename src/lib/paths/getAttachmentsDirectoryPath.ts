import { join } from "node:path";
import { getContentRootPath } from "./getContentRootPath";
import { ATTACHMENTS_DIRECTORY_NAME } from "./constants";

/** Returns the path to the attachments directory within the content root. */
export function getAttachmentsDirectoryPath(): string {
    return join(getContentRootPath(), ATTACHMENTS_DIRECTORY_NAME);
}
