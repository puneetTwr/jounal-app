import type { MarkdownDocument } from "@/lib/markdown";
import { TEMPLATE_FRONT_MATTER_KEY_ORDER } from "./constants";
import type { TemplateEntry, TemplateFrontMatter } from "./types";

/**
 * Converts a TemplateEntry into a MarkdownDocument, ready for
 * serialization. Front matter keys are written in
 * TEMPLATE_FRONT_MATTER_KEY_ORDER so that every template file on disk
 * orders its keys the same way, regardless of property enumeration
 * order in memory. The optional `description` key is omitted entirely
 * when absent, rather than written as `undefined`.
 *
 * Performs no validation — callers that need a guarantee the template
 * is well-formed should validate it before mapping.
 */
export function toMarkdownDocument(entry: TemplateEntry): MarkdownDocument {
    const frontMatter: Record<string, unknown> = {};

    for (const key of TEMPLATE_FRONT_MATTER_KEY_ORDER) {
        const value = entry.frontMatter[key];
        if (value !== undefined) {
            frontMatter[key] = value;
        }
    }

    return {
        frontMatter,
        content: entry.content,
    };
}

/**
 * Converts a MarkdownDocument into a TemplateEntry shape.
 *
 * This is a structural mapping only: the document's front matter is
 * untrusted, arbitrary data, and is passed through unchanged aside from
 * being treated as a TemplateFrontMatter. The result must be passed
 * through validateTemplateEntry() before being trusted as a genuine
 * TemplateEntry.
 */
export function toTemplateEntry(document: MarkdownDocument): TemplateEntry {
    return {
        frontMatter: document.frontMatter as unknown as TemplateFrontMatter,
        content: document.content,
    };
}
