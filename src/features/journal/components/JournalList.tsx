import type { JournalEntry } from "../types";
import { EmptyState } from "./EmptyState";
import { JournalCard } from "./JournalCard";

interface JournalListProps {
    entries: JournalEntry[];
    /** Whether a search query or filter is currently applied — changes the empty-state message. */
    hasActiveFilters?: boolean;
}

/**
 * Read-only presentational list of journal entries. Renders
 * EmptyState when there are none. Assumes `entries` is already in the
 * desired display order — this component does not sort or filter.
 */
export function JournalList({ entries, hasActiveFilters = false }: JournalListProps) {
    if (entries.length === 0) {
        return <EmptyState hasActiveFilters={hasActiveFilters} />;
    }

    return (
        <ul className="flex flex-col gap-3">
            {entries.map((entry) => (
                <li key={entry.frontMatter.id}>
                    <JournalCard entry={entry} />
                </li>
            ))}
        </ul>
    );
}
