import type { JournalFrontMatter } from "../types";
import { formatJournalDate, formatJournalDateTime } from "./formatJournalDate";
import { JournalStatusBadges } from "./JournalStatusBadges";

interface JournalMetadataProps {
    frontMatter: JournalFrontMatter;
}

/**
 * Full metadata header for a single journal entry: title, journal
 * date, created/updated timestamps, tags, and favorite/pinned/archived
 * state. Read-only — renders no editing controls.
 */
export function JournalMetadata({ frontMatter }: JournalMetadataProps) {
    return (
        <header className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
                <h1 className="text-2xl font-bold">{frontMatter.title}</h1>
                <JournalStatusBadges frontMatter={frontMatter} />
            </div>

            <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-black/60 dark:text-white/60">
                <div className="flex gap-1">
                    <dt className="font-medium">Journal date:</dt>
                    <dd>{formatJournalDate(frontMatter.journalDate)}</dd>
                </div>
                <div className="flex gap-1">
                    <dt className="font-medium">Created:</dt>
                    <dd>{formatJournalDateTime(frontMatter.createdAt)}</dd>
                </div>
                <div className="flex gap-1">
                    <dt className="font-medium">Last updated:</dt>
                    <dd>{formatJournalDateTime(frontMatter.updatedAt)}</dd>
                </div>
            </dl>

            {frontMatter.tags.length > 0 && (
                <ul aria-label="Tags" className="flex flex-wrap gap-1.5">
                    {frontMatter.tags.map((tag) => (
                        <li key={tag} className="rounded-full px-2 py-0.5 text-xs bg-black/5 dark:bg-white/10">
                            {tag}
                        </li>
                    ))}
                </ul>
            )}
        </header>
    );
}
