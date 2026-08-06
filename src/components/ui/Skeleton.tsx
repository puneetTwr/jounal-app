interface SkeletonProps {
    className?: string;
}

/**
 * A pulsing placeholder block standing in for content that hasn't
 * loaded yet. Purely a shape — pass sizing via `className` (e.g.
 * "h-4 w-32") to stand in for a line of text, a form field, a card, or
 * anything else. Uses the app's existing black/white-opacity
 * convention (see JournalCard, SaveIndicator, ...) rather than a
 * new color, and Tailwind's built-in `animate-pulse` rather than a
 * custom keyframe, so it's already theme-consistent and cheap to
 * render.
 *
 * `aria-hidden` because a skeleton has no content of its own to
 * announce — the surrounding component is responsible for conveying
 * loading state to assistive technology (e.g. an `aria-busy` region or
 * a visually-hidden "Loading…" label).
 */
export function Skeleton({ className = "" }: SkeletonProps) {
    return <div aria-hidden="true" className={`animate-pulse rounded bg-black/10 dark:bg-white/10 ${className}`} />;
}
