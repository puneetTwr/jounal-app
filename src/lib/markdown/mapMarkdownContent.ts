import type { ValidationIssue, ValidationResult } from "@/lib/validation";
import { parseMarkdownDocument } from "./parseMarkdownDocument";
import type { MarkdownDocument } from "./types";

/**
 * Parses a raw Markdown string and validates it as a domain entity:
 * Markdown parser -> caller-supplied structural mapper -> caller-supplied
 * validator. Fetching the raw content (a disk read, a GitHub API call,
 * ...) is the caller's concern — this is the shared middle of that
 * pipeline, used by loadMarkdownEntryFile() (filesystem storage) and
 * directly by any backend that already has the content in hand (e.g.
 * the GitHub API storage backend — see ADR-002), so "how do we go from
 * raw text to a validated domain entity" is written exactly once.
 */
export function mapMarkdownContent<T>(
    content: string,
    sourceDescription: string,
    toEntry: (document: MarkdownDocument) => unknown,
    validate: (value: unknown) => ValidationResult<T>,
    onInvalid: (sourceDescription: string, issues: ValidationIssue[]) => Error
): T {
    const document = parseMarkdownDocument(content);
    const mapped = toEntry(document);
    const result = validate(mapped);

    if (!result.valid) {
        throw onInvalid(sourceDescription, result.issues);
    }

    return result.value;
}
