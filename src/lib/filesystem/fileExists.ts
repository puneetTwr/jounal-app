import { stat } from "node:fs/promises";
import { FileSystemError, hasErrorCode } from "./errors";

/**
 * Checks whether a file (or directory) exists at the given path.
 * Returns false only when the path is genuinely absent; any other
 * failure (e.g. a permissions error) is thrown rather than hidden
 * behind a false result.
 */
export async function fileExists(targetPath: string): Promise<boolean> {
  try {
    await stat(targetPath);
    return true;
  } catch (error) {
    if (hasErrorCode(error, "ENOENT")) {
      return false;
    }
    throw new FileSystemError("fileExists", targetPath, error);
  }
}
