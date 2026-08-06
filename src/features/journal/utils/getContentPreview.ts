const PREVIEW_MAX_LENGTH = 160;

/**
 * Strips the most common Markdown syntax (headings, emphasis, links,
 * code fences/inline code, blockquotes, list markers) from `content`
 * and collapses whitespace, producing a short plain-text preview for a
 * card summary line. Not a full Markdown parser — this only needs to
 * read reasonably as a snippet, not round-trip back to Markdown.
 *
 * Returns "" for empty/whitespace-only content — callers decide
 * whether/how to render that case, this never invents placeholder text.
 */
export function getContentPreview(content: string, maxLength: number = PREVIEW_MAX_LENGTH): string {
    const plainText = content
        .replace(/```[\s\S]*?```/g, " ")
        .replace(/`([^`]+)`/g, "$1")
        .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
        .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
        .replace(/^#{1,6}\s+/gm, "")
        .replace(/^>\s?/gm, "")
        .replace(/^[-*+]\s+/gm, "")
        .replace(/^\d+\.\s+/gm, "")
        .replace(/[*_~]{1,3}/g, "")
        .replace(/\s+/g, " ")
        .trim();

    if (plainText.length <= maxLength) {
        return plainText;
    }

    return `${plainText.slice(0, maxLength).trimEnd()}…`;
}
