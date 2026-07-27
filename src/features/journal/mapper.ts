import type { MarkdownDocument } from "@/lib/markdown";
import { JOURNAL_FRONT_MATTER_KEY_ORDER } from "./constants";
import type { JournalEntry, JournalFrontMatter } from "./types";

/**
 * Converts a JournalEntry into a MarkdownDocument, ready for
 * serialization. Front matter keys are written in
 * JOURNAL_FRONT_MATTER_KEY_ORDER so that every entry file on disk
 * orders its keys the same way, regardless of property enumeration
 * order in memory.
 *
 * Performs no validation — callers that need a guarantee the entry is
 * well-formed should validate it before mapping.
 */
export function toMarkdownDocument(entry: JournalEntry): MarkdownDocument {
    const frontMatter: Record<string, unknown> = {};

    for (const key of JOURNAL_FRONT_MATTER_KEY_ORDER) {
        frontMatter[key] = entry.frontMatter[key];
    }

    return {
        frontMatter,
        content: entry.content,
    };
}

/**
 * Converts a MarkdownDocument into a JournalEntry shape.
 *
 * This is a structural mapping only: the document's front matter is
 * untrusted, arbitrary data, and is passed through unchanged aside from
 * being treated as a JournalFrontMatter. The result must be passed
 * through validateJournalEntry() before being trusted as a genuine
 * JournalEntry.
 */
export function toJournalEntry(document: MarkdownDocument): JournalEntry {
    return {
        frontMatter: document.frontMatter as unknown as JournalFrontMatter,
        content: document.content,
    };
}
