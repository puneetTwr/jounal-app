/** Shown in place of the journal list when there are no entries to display. */
export function EmptyState() {
    return (
        <div className="py-16 text-center text-black/60 dark:text-white/60">
            <p className="text-base font-medium">No journal entries found.</p>
            <p className="mt-1 text-sm">Start writing to see your first journal entry here.</p>
        </div>
    );
}
