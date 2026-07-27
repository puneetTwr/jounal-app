/**
 * A parsed Markdown document: its front matter as a plain key/value
 * object, and its remaining Markdown body as a raw string.
 *
 * This type deliberately says nothing about what any front matter key
 * means, or what shape the document represents (a journal entry, a
 * template, a note). That interpretation belongs to whichever layer
 * consumes a MarkdownDocument, not to this one.
 */
export interface MarkdownDocument {
  frontMatter: Record<string, unknown>;
  content: string;
}
