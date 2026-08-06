import Link from "next/link";
import { getJournalDetailPath } from "../actions/paths";
import type { JournalEntry } from "../types";
import { getContentPreview } from "../utils";
import { formatJournalDate, formatJournalDateTime } from "./formatJournalDate";
import { JournalQuickToggles } from "./JournalQuickToggles";
import { JournalStatusBadges } from "./JournalStatusBadges";

interface JournalCardProps {
    entry: JournalEntry;
}

/**
 * Read-only presentational summary of a single journal entry: title,
 * a short content preview, journal date, last-updated time, tags, its
 * archived state, and pin/favorite quick-toggles.
 *
 * The whole card is one click target — a "stretched link" overlay
 * (`absolute inset-0`, default stacking) rather than wrapping all the
 * content in a real `<a>`, specifically so JournalQuickToggles' real
 * `<button>`s can sit inside the card without nesting interactive
 * elements inside an anchor (invalid HTML, and unreliable to click).
 * The toggles wrapper gets `relative z-10` to paint above the overlay
 * link; everything else is plain, unpositioned content, which the
 * stacking rules already place below the positioned overlay link, so
 * clicking anywhere else on the card — title, preview, dates, tags —
 * still navigates.
 */
export function JournalCard({ entry }: JournalCardProps) {
    const { frontMatter, content } = entry;
    const preview = getContentPreview(content);

    return (
        <article className="group relative flex flex-col gap-2 rounded-lg border border-border bg-surface p-4 transition-[box-shadow,border-color] hover:border-accent/40 hover:shadow-md">
            <Link
                href={getJournalDetailPath(frontMatter.id)}
                className="absolute inset-0 z-0 rounded-lg"
                aria-label={`Open "${frontMatter.title}"`}
            />

            <div className="flex items-start justify-between gap-2">
                <h2 className="text-heading font-semibold group-hover:text-accent">{frontMatter.title}</h2>

                <div className="relative z-10 flex items-center gap-1">
                    <JournalStatusBadges frontMatter={frontMatter} />
                    <JournalQuickToggles entry={entry} />
                </div>
            </div>

            {preview.length > 0 && <p className="line-clamp-2 text-body text-muted-foreground">{preview}</p>}

            <dl className="flex flex-wrap gap-x-4 gap-y-1 text-meta text-muted-foreground">
                <div className="flex gap-1">
                    <dt className="font-medium">Journal date:</dt>
                    <dd>{formatJournalDate(frontMatter.journalDate)}</dd>
                </div>
                <div className="flex gap-1">
                    <dt className="font-medium">Last updated:</dt>
                    <dd>{formatJournalDateTime(frontMatter.updatedAt)}</dd>
                </div>
            </dl>

            {frontMatter.tags.length > 0 && (
                <ul aria-label="Tags" className="flex flex-wrap gap-1.5">
                    {frontMatter.tags.map((tag) => (
                        <li key={tag} className="rounded-full bg-muted-foreground/10 px-2 py-0.5 text-meta">
                            {tag}
                        </li>
                    ))}
                </ul>
            )}
        </article>
    );
}
