"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface SearchAndFilterBarProps {
    initialQuery: string;
    initialFavorite: boolean;
    initialPinned: boolean;
    initialArchived: boolean;
}

interface FilterState {
    query: string;
    favorite: boolean;
    pinned: boolean;
    archived: boolean;
}

const SEARCH_DEBOUNCE_MS = 300;

/**
 * Search input + favorite/pinned/archived filter checkboxes + a
 * conditional "Clear filters" action.
 *
 * This component only edits the URL (via the router) — it never calls
 * a Server Action itself. The page (a Server Component) reads the
 * resulting search params and passes them into the existing
 * listJournals() Server Action at render time, so search results stay
 * shareable/bookmarkable and the architecture's one data-fetching path
 * (UI → Server Action → Service → Repository) is unchanged.
 *
 * Only the text query is debounced (typing shouldn't push a new URL on
 * every keystroke); the checkboxes push immediately since each click
 * is already a single discrete change.
 */
export function SearchAndFilterBar({
    initialQuery,
    initialFavorite,
    initialPinned,
    initialArchived,
}: SearchAndFilterBarProps) {
    const router = useRouter();
    const pathname = usePathname();

    const [query, setQuery] = useState(initialQuery);
    const [favorite, setFavorite] = useState(initialFavorite);
    const [pinned, setPinned] = useState(initialPinned);
    const [archived, setArchived] = useState(initialArchived);

    const isFirstRender = useRef(true);

    function pushFilters(next: FilterState) {
        const params = new URLSearchParams();

        const trimmedQuery = next.query.trim();
        if (trimmedQuery.length > 0) {
            params.set("q", trimmedQuery);
        }
        if (next.favorite) {
            params.set("favorite", "1");
        }
        if (next.pinned) {
            params.set("pinned", "1");
        }
        if (next.archived) {
            params.set("archived", "1");
        }

        const queryString = params.toString();
        router.replace(queryString.length > 0 ? `${pathname}?${queryString}` : pathname);
    }

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        const timeoutId = setTimeout(() => {
            pushFilters({ query, favorite, pinned, archived });
        }, SEARCH_DEBOUNCE_MS);

        return () => clearTimeout(timeoutId);
        // Only the query's own debounce timer should reset when it changes;
        // checkbox toggles push immediately via handleFlagToggle below.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query]);

    function handleFlagToggle(flag: "favorite" | "pinned" | "archived", checked: boolean) {
        const next: FilterState = {
            query,
            favorite: flag === "favorite" ? checked : favorite,
            pinned: flag === "pinned" ? checked : pinned,
            archived: flag === "archived" ? checked : archived,
        };

        setFavorite(next.favorite);
        setPinned(next.pinned);
        setArchived(next.archived);
        pushFilters(next);
    }

    function handleClearFilters() {
        setQuery("");
        setFavorite(false);
        setPinned(false);
        setArchived(false);
        router.replace(pathname);
    }

    const hasActiveFilters = query.trim().length > 0 || favorite || pinned || archived;

    return (
        <div className="mb-6 flex flex-col gap-3">
            <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search title, content, or tags…"
                aria-label="Search journals"
                className="rounded border border-black/20 px-3 py-2 text-sm dark:border-white/20"
            />

            <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                    <input
                        type="checkbox"
                        checked={favorite}
                        onChange={(event) => handleFlagToggle("favorite", event.target.checked)}
                    />
                    Favorite
                </label>
                <label className="flex items-center gap-2 text-sm">
                    <input
                        type="checkbox"
                        checked={pinned}
                        onChange={(event) => handleFlagToggle("pinned", event.target.checked)}
                    />
                    Pinned
                </label>
                <label className="flex items-center gap-2 text-sm">
                    <input
                        type="checkbox"
                        checked={archived}
                        onChange={(event) => handleFlagToggle("archived", event.target.checked)}
                    />
                    Archived
                </label>

                {hasActiveFilters && (
                    <button
                        type="button"
                        onClick={handleClearFilters}
                        className="ml-auto text-sm font-medium text-black/60 hover:underline dark:text-white/60"
                    >
                        Clear filters
                    </button>
                )}
            </div>
        </div>
    );
}
