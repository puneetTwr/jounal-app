import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { FileSystemError } from "./errors";

/**
 * Recursively lists every file (not directory) contained within the
 * given directory, returning full paths. Directories are traversed but
 * never included in the result themselves.
 */
export async function listFilesRecursively(directoryPath: string): Promise<string[]> {
  let entries;

  try {
    entries = await readdir(directoryPath, { withFileTypes: true });
  } catch (error) {
    throw new FileSystemError("listFilesRecursively", directoryPath, error);
  }

  const filePaths: string[] = [];

  for (const entry of entries) {
    const entryPath = join(directoryPath, entry.name);

    if (entry.isDirectory()) {
      const nestedFilePaths = await listFilesRecursively(entryPath);
      filePaths.push(...nestedFilePaths);
    } else if (entry.isFile()) {
      filePaths.push(entryPath);
    }
  }

  return filePaths;
}
