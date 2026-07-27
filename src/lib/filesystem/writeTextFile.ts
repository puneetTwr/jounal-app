import { writeFile } from "node:fs/promises";
import { FileSystemError } from "./errors";

/**
 * Writes text content to a file, overwriting any existing content.
 * Does not create missing parent directories; callers that need that
 * should call ensureDirectoryExists() first.
 */
export async function writeTextFile(path: string, contents: string): Promise<void> {
  try {
    await writeFile(path, contents, { encoding: "utf-8" });
  } catch (error) {
    throw new FileSystemError("writeTextFile", path, error);
  }
}
