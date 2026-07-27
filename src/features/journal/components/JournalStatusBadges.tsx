import type { JournalFrontMatter } from "../types";

interface JournalStatusBadgesProps {
    frontMatter: Pick<JournalFrontMatter, "favorite" | "pinned" | "archived">;
}

/**
 * Pinned/favorite/archived badge row, shared by JournalCard (list) and
 * JournalMetadata (detail) so both surfaces render the same states the
 * same way.
 */
export function JournalStatusBadges({ frontMatter }: JournalStatusBadgesProps) {
    return (
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
    );
}
