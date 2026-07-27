import { unlink } from "node:fs/promises";
import { FileSystemError } from "./errors";

/**
 * Deletes a single file. Fails if the file does not exist; callers
 * that want idempotent delete semantics should check fileExists()
 * first rather than have this function silently ignore a missing file.
 */
export async function deleteFile(filePath: string): Promise<void> {
  try {
    await unlink(filePath);
  } catch (error) {
    throw new FileSystemError("deleteFile", filePath, error);
  }
}
