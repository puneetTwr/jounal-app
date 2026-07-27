import { readFile } from "node:fs/promises";
import { FileSystemError } from "./errors";

/**
 * Reads the full contents of a file as UTF-8 text.
 * Does not interpret the contents in any way; callers are responsible
 * for parsing whatever format the file holds.
 */
export async function readTextFile(path: string): Promise<string> {
  try {
    return await readFile(path, { encoding: "utf-8" });
  } catch (error) {
    throw new FileSystemError("readTextFile", path, error);
  }
}
