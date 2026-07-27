import { readFile } from "node:fs/promises";
import { FileSystemError } from "./errors";

/**
 * Reads the full contents of a file as UTF-8 text.
 * Does not interpret the contents in any way; callers are responsible
 * for parsing whatever format the file holds.
 */
export async function readTextFile(filePath: string): Promise<string> {
  try {
    return await readFile(filePath, { encoding: "utf-8" });
  } catch (error) {
    throw new FileSystemError("readTextFile", filePath, error);
  }
}
