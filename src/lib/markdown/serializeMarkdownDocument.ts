import matter from "gray-matter";
import { yamlEngine } from "./yamlEngine";
import type { MarkdownDocument } from "./types";

/**
 * Serializes a MarkdownDocument back into a single Markdown string:
 * its front matter written as a YAML block (omitted entirely when
 * frontMatter has no keys), followed by its content, unchanged.
 */
export function serializeMarkdownDocument(document: MarkdownDocument): string {
  return matter.stringify(document.content, document.frontMatter, {
    engines: { yaml: yamlEngine },
  });
}
