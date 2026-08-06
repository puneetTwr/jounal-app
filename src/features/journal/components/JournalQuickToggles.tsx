"use client";

import { Heart, Pin } from "lucide-react";
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
 * complexity isn't justified here.
 */
export function JournalQuickToggles({ entry }: JournalQuickTogglesProps) {
    const [favorite, setFavorite] = useState(entry.frontMatter.favorite);
    const [pinned, setPinned] = useState(entry.frontMatter.pinned);
    const [, startTransition] = useTransition();

    function toggle(field: "favorite" | "pinned", event: MouseEvent) {
        event.preventDefault();
        event.stopPropagation();

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
            }
        });
    }

    return (
        <div className="flex shrink-0 items-center gap-0.5">
            <button
                type="button"
                onClick={(event) => toggle("favorite", event)}
                aria-pressed={favorite}
                aria-label={favorite ? "Remove from favorites" : "Add to favorites"}
                title={favorite ? "Remove from favorites" : "Add to favorites"}
                className={`rounded-full p-1.5 hover:bg-favorite/10 ${favorite ? "text-favorite" : "text-muted-foreground"}`}
            >
                <Heart className="h-4 w-4" aria-hidden="true" fill={favorite ? "currentColor" : "none"} />
            </button>
            <button
                type="button"
                onClick={(event) => toggle("pinned", event)}
                aria-pressed={pinned}
                aria-label={pinned ? "Unpin" : "Pin"}
                title={pinned ? "Unpin" : "Pin"}
                className={`rounded-full p-1.5 hover:bg-pinned/10 ${pinned ? "text-pinned" : "text-muted-foreground"}`}
            >
                <Pin className="h-4 w-4" aria-hidden="true" fill={pinned ? "currentColor" : "none"} />
            </button>
        </div>
    );
}
