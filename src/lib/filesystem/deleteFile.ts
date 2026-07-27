import { unlink } from "node:fs/promises";
import { FileSystemError } from "./errors";

/**
 * Deletes a single file. Fails if the file does not exist; callers
 * that want idempotent delete semantics should check fileExists()
 * first rather than have this function silently ignore a missing file.
 */
export async function deleteFile(path: string): Promise<void> {
  try {
    await unlink(path);
  } catch (error) {
    throw new FileSystemError("deleteFile", path, error);
  }
}
