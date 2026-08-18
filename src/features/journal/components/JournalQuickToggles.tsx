"use client";

import { AlertCircle, Heart, Pin } from "lucide-react";
import { useState, useTransition, type MouseEvent } from "react";
import { updateJournalMetadata } from "../actions/updateJournalMetadata";
import type { JournalEntry } from "../types";

interface JournalQuickTogglesProps {
    entry: JournalEntry;
}

/**
 * Pin/favorite quick-toggle buttons on a JournalCard: flips
 * immediately (optimistic) and reconciles with the server in the
 * background, rolling back on failure — a one-bit preference like this
 * shouldn't have to wait on a round trip before the UI reacts. Reuses
 * the existing updateJournalMetadata Server Action (supplying every
 * other field unchanged) rather than introducing a new one.
 *
 * Sits inside JournalCard's full-card stretched Link (see JournalCard)
 * — stopPropagation/preventDefault keep a click here from also
 * triggering the card's own navigation.
 *
 * Unlike the autosave editors, this doesn't guard against out-of-order
 * responses with a sequence number: the stakes of a rare mis-rollback
 * on a rapid double-toggle are low (click it again), so that extra
 * complexity isn't justified here. Buttons are disabled while a toggle
 * is in flight so a second click can't fire a concurrent request in the
 * first place, and a failed toggle now says so — silently snapping back
 * with no explanation left the user guessing why their click "did
 * nothing".
 */
export function JournalQuickToggles({ entry }: JournalQuickTogglesProps) {
    const [favorite, setFavorite] = useState(entry.frontMatter.favorite);
    const [pinned, setPinned] = useState(entry.frontMatter.pinned);
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    function toggle(field: "favorite" | "pinned", event: MouseEvent) {
        event.preventDefault();
        event.stopPropagation();

        if (isPending) {
            return;
        }

        setError(null);

        const nextFavorite = field === "favorite" ? !favorite : favorite;
        const nextPinned = field === "pinned" ? !pinned : pinned;

        setFavorite(nextFavorite);
        setPinned(nextPinned);

        startTransition(async () => {
            const result = await updateJournalMetadata({
                id: entry.frontMatter.id,
                title: entry.frontMatter.title,
                journalDate: entry.frontMatter.journalDate,
                tags: entry.frontMatter.tags,
                favorite: nextFavorite,
                pinned: nextPinned,
                archived: entry.frontMatter.archived,
            });

            if (result.status === "error") {
                setFavorite(entry.frontMatter.favorite);
                setPinned(entry.frontMatter.pinned);
                setError("Couldn't save. Try again.");
            }
        });
    }

    return (
        <div className="relative flex shrink-0 items-center gap-0.5">
            <button
                type="button"
                onClick={(event) => toggle("favorite", event)}
                disabled={isPending}
                aria-pressed={favorite}
                aria-label={favorite ? "Remove from favorites" : "Add to favorites"}
                title={favorite ? "Remove from favorites" : "Add to favorites"}
                className={`rounded-full p-2.5 hover:bg-favorite/10 disabled:opacity-50 ${favorite ? "text-favorite" : "text-muted-foreground"}`}
            >
                <Heart className="h-4 w-4" aria-hidden="true" fill={favorite ? "currentColor" : "none"} />
            </button>
            <button
                type="button"
                onClick={(event) => toggle("pinned", event)}
                disabled={isPending}
                aria-pressed={pinned}
                aria-label={pinned ? "Unpin" : "Pin"}
                title={pinned ? "Unpin" : "Pin"}
                className={`rounded-full p-2.5 hover:bg-pinned/10 disabled:opacity-50 ${pinned ? "text-pinned" : "text-muted-foreground"}`}
            >
                <Pin className="h-4 w-4" aria-hidden="true" fill={pinned ? "currentColor" : "none"} />
            </button>

            {error && (
                <p
                    role="alert"
                    className="absolute right-0 top-full z-10 mt-1 flex items-center gap-1 whitespace-nowrap rounded bg-surface-elevated px-2 py-1 text-meta text-danger shadow-md"
                >
                    <AlertCircle className="h-3 w-3" aria-hidden="true" />
                    {error}
                </p>
            )}
        </div>
    );
}
