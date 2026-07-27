import Link from "next/link";
import { JOURNAL_LIST_PATH } from "../actions/paths";
import type { JournalEntry } from "../types";
import { JournalMarkdown } from "./JournalMarkdown";
import { JournalMetadata } from "./JournalMetadata";

interface JournalDetailProps {
    entry: JournalEntry;
}

/**
 * Read-only detail view of a single journal entry: a "back to
 * journals" link, its full metadata, and its Markdown body. Renders no
 * editing controls — this is the permanent foundation editing will be
 * layered onto in a future milestone, not the editing UI itself.
 */
export function JournalDetail({ entry }: JournalDetailProps) {
    return (
        <article className="flex flex-col gap-6">
            <Link
                href={JOURNAL_LIST_PATH}
                className="w-fit text-sm font-medium text-black/60 hover:underline dark:text-white/60"
            >
                ← Back to Journals
            </Link>

            <JournalMetadata frontMatter={entry.frontMatter} />

            <JournalMarkdown content={entry.content} />
        </article>
    );
}
