import { mkdir } from "node:fs/promises";
import { FileSystemError } from "./errors";

/**
 * Ensures that a directory exists at the given path, creating any
 * missing parent directories along the way. Resolves silently if the
 * directory already exists.
 */
export async function ensureDirectoryExists(path: string): Promise<void> {
  try {
    await mkdir(path, { recursive: true });
  } catch (error) {
    throw new FileSystemError("ensureDirectoryExists", path, error);
  }
}
