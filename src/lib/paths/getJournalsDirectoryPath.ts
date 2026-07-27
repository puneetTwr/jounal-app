import { join } from "node:path";
import { getContentRootPath } from "./getContentRootPath";
import { JOURNALS_DIRECTORY_NAME } from "./constants";

/** Returns the path to the journals directory within the content root. */
export function getJournalsDirectoryPath(): string {
    return join(getContentRootPath(), JOURNALS_DIRECTORY_NAME);
}
