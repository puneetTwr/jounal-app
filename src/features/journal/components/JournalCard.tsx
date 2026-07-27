import type { JournalEntry } from "../types";

interface JournalCardProps {
    entry: JournalEntry;
}

const DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
};

const DATE_TIME_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
    ...DATE_FORMAT_OPTIONS,
    hour: "numeric",
    minute: "2-digit",
};

function formatDate(isoDate: string): string {
    return new Date(isoDate).toLocaleDateString("en-US", DATE_FORMAT_OPTIONS);
}

function formatDateTime(isoDateTime: string): string {
    return new Date(isoDateTime).toLocaleString("en-US", DATE_TIME_FORMAT_OPTIONS);
}

/**
 * Read-only presentational summary of a single journal entry: title,
 * journal date, last-updated time, tags, and its favorite/pinned/
 * archived state. Deliberately never renders `entry.content`.
 */
export function JournalCard({ entry }: JournalCardProps) {
    const { frontMatter } = entry;

    return (
        <article className="flex flex-col gap-2 rounded-lg border border-black/10 p-4 dark:border-white/15">
            <div className="flex items-start justify-between gap-2">
                <h2 className="text-lg font-semibold">{frontMatter.title}</h2>

                <div className="flex shrink-0 gap-1">
                    {frontMatter.pinned && (
                        <span
                            role="status"
                            aria-label="Pinned"
                            className="rounded px-2 py-0.5 text-xs bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200"
                        >
                            Pinned
                        </span>
                    )}
                    {frontMatter.favorite && (
                        <span
                            role="status"
                            aria-label="Favorite"
                            className="rounded px-2 py-0.5 text-xs bg-pink-100 text-pink-900 dark:bg-pink-900/40 dark:text-pink-200"
                        >
                            Favorite
                        </span>
                    )}
                    {frontMatter.archived && (
                        <span
                            role="status"
                            aria-label="Archived"
                            className="rounded px-2 py-0.5 text-xs bg-black/10 dark:bg-white/10"
                        >
                            Archived
                        </span>
                    )}
                </div>
            </div>

            <dl className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-black/60 dark:text-white/60">
                <div className="flex gap-1">
                    <dt className="font-medium">Journal date:</dt>
                    <dd>{formatDate(frontMatter.journalDate)}</dd>
                </div>
                <div className="flex gap-1">
                    <dt className="font-medium">Last updated:</dt>
                    <dd>{formatDateTime(frontMatter.updatedAt)}</dd>
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
        </article>
    );
}
