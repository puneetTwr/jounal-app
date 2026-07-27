import { rename } from "node:fs/promises";
import { FileSystemError } from "./errors";

/**
 * Moves (renames) a single file from sourcePath to destinationPath
 * using the native rename() call. Does not create missing destination
 * directories, and does not impose its own overwrite policy — whatever
 * rename() does natively on the host platform is what happens here.
 */
export async function moveFile(sourcePath: string, destinationPath: string): Promise<void> {
  try {
    await rename(sourcePath, destinationPath);
  } catch (error) {
    throw new FileSystemError("moveFile", { sourcePath, destinationPath }, error);
  }
}
