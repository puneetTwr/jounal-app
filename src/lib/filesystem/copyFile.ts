import { copyFile as copyFileNative } from "node:fs/promises";
import { FileSystemError } from "./errors";

/**
 * Copies a single file from sourcePath to destinationPath using the
 * native copyFile() call. Does not create missing destination
 * directories, and imposes no overwrite policy beyond whatever
 * copyFile() does natively on the host platform.
 */
export async function copyFile(sourcePath: string, destinationPath: string): Promise<void> {
  try {
    await copyFileNative(sourcePath, destinationPath);
  } catch (error) {
    throw new FileSystemError("copyFile", `${sourcePath} -> ${destinationPath}`, error);
  }
}
