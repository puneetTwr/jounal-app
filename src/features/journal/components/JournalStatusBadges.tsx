import { Archive } from "lucide-react";
import type { JournalFrontMatter } from "../types";

interface JournalStatusBadgesProps {
    frontMatter: Pick<JournalFrontMatter, "archived">;
}

/**
 * Read-only "Archived" badge, used by JournalCard. Pinned/favorite are
 * no longer shown here — they're the interactive toggle buttons in
 * JournalQuickToggles, which double as their own status indicator
 * (filled = active), so a separate read-only badge for them would be
 * redundant.
 */
export function JournalStatusBadges({ frontMatter }: JournalStatusBadgesProps) {
    if (!frontMatter.archived) {
        return null;
    }

    return (
        <span
            role="status"
            aria-label="Archived"
            className="inline-flex items-center gap-1 rounded-full bg-muted-foreground/10 px-2 py-0.5 text-meta text-muted-foreground"
        >
            <Archive className="h-3 w-3" aria-hidden="true" />
            Archived
        </span>
    );
}
