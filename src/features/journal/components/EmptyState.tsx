import { NotebookPen, SearchX } from "lucide-react";

interface EmptyStateProps {
    /** True when the current view is filtered/searched down to nothing, as opposed to a genuinely empty journal. */
    hasActiveFilters?: boolean;
}

/** Shown in place of the journal list when there are no entries to display. */
export function EmptyState({ hasActiveFilters = false }: EmptyStateProps) {
    if (hasActiveFilters) {
        return (
            <div className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
                <SearchX className="h-8 w-8" aria-hidden="true" />
                <p className="text-heading font-medium">No journal entries match your search.</p>
                <p className="text-body">Try a different search term, or clear your filters.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
            <NotebookPen className="h-8 w-8" aria-hidden="true" />
            <p className="text-heading font-medium">No journal entries found.</p>
            <p className="text-body">Click New Journal (or just press n) to start writing.</p>
        </div>
    );
}
