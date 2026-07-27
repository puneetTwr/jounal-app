import type { JournalEntry } from "../types";
import { EmptyState } from "./EmptyState";
import { JournalCard } from "./JournalCard";

interface JournalListProps {
    entries: JournalEntry[];
}

/**
 * Read-only presentational list of journal entries. Renders
 * EmptyState when there are none. Assumes `entries` is already in the
 * desired display order — this component does not sort.
 */
export function JournalList({ entries }: JournalListProps) {
    if (entries.length === 0) {
        return <EmptyState />;
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
