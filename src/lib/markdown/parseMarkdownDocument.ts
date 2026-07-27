import matter from "gray-matter";
import { yamlEngine } from "./yamlEngine";
import type { MarkdownDocument } from "./types";

/**
 * Parses a raw Markdown string into its front matter and content.
 *
 * Front matter values are returned exactly as written — including ISO
 * date strings, numbers, booleans, arrays, and multiline strings —
 * with no interpretation or validation of what any key means. A
 * document with no front matter yields an empty frontMatter object.
 */
export function parseMarkdownDocument(markdown: string): MarkdownDocument {
  const parsed = matter(markdown, { engines: { yaml: yamlEngine } });

  return {
    frontMatter: parsed.data,
    content: parsed.content,
  };
}
