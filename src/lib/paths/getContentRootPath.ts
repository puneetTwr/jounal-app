import { getJournalContentRoot } from "@/lib/config";

/**
 * Returns the configured content root path.
 *
 * This is the single point through which any other layer should
 * obtain the content root — callers should never read
 * `JOURNAL_CONTENT_ROOT` or the config module directly for path
 * purposes, so that every derived directory in this module stays
 * consistent with a single source of truth.
 */
export function getContentRootPath(): string {
    return getJournalContentRoot();
}
