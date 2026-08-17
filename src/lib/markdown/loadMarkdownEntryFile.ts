import { readTextFile } from "@/lib/filesystem";
import type { ValidationIssue, ValidationResult } from "@/lib/validation";
import { mapMarkdownContent } from "./mapMarkdownContent";
import type { MarkdownDocument } from "./types";

/**
 * Loads a single Markdown-backed domain entity from disk and validates
 * it: Filesystem -> Markdown parser -> caller-supplied structural
 * mapper -> caller-supplied validator (the read-from-disk step wrapping
 * mapMarkdownContent(), which every storage backend shares).
 *
 * Shared by every domain (journal, template, ...) that stores one
 * record per Markdown file, so the read path — and what happens when a
 * file on disk turns out to be corrupt — only has to be written once.
 * Throws whatever error `onInvalid` constructs if validation fails,
 * rather than silently returning unvalidated data.
 */
export async function loadMarkdownEntryFile<T>(
    filePath: string,
    toEntry: (document: MarkdownDocument) => unknown,
    validate: (value: unknown) => ValidationResult<T>,
    onInvalid: (filePath: string, issues: ValidationIssue[]) => Error
): Promise<T> {
    const rawContents = await readTextFile(filePath);
    return mapMarkdownContent(rawContents, filePath, toEntry, validate, onInvalid);
}
