import type { JournalEntry } from "../types";
import { JournalBodyEditor } from "./JournalBodyEditor";
import { JournalMetadata } from "./JournalMetadata";

interface JournalDetailProps {
    entry: JournalEntry;
}

/**
 * Composes the "back to journals" nav/save row, the read-only metadata
 * header, and the Markdown body editor for a single journal entry.
 *
 * JournalMetadata is passed as a child of JournalBodyEditor (a Client
 * Component) rather than imported by it directly: Server Components
 * can be rendered as children of a Client Component even though a
 * Client Component cannot import one, so JournalMetadata stays a pure
 * Server Component with zero client JS of its own, while still
 * rendering in its original visual position between the nav row and
 * the body.
 *
 * Metadata itself remains read-only this milestone — only the
 * Markdown body is editable.
 */
export function JournalDetail({ entry }: JournalDetailProps) {
    return (
        <article className="flex flex-col gap-6">
            <JournalBodyEditor id={entry.frontMatter.id} initialContent={entry.content}>
                <JournalMetadata frontMatter={entry.frontMatter} />
            </JournalBodyEditor>
        </article>
    );
}
