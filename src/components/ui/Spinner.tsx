interface SpinnerProps {
    className?: string;
    label?: string;
}

/**
 * A small, subtle rotating spinner for inline or button loading
 * states (e.g. a submit button's "Saving…" state) — reach for
 * `Skeleton`/`SkeletonField` instead when the loading content has a
 * known shape (a form, a list) rather than a single point of action.
 *
 * Uses Tailwind's built-in `animate-spin` (a CSS transform, not a JS
 * timer) and the app's existing black/white-opacity border convention,
 * so it matches light and dark mode without introducing a new color.
 */
export function Spinner({ className = "h-4 w-4", label = "Loading" }: SpinnerProps) {
    return (
        <span
            role="status"
            aria-label={label}
            className={`inline-block animate-spin rounded-full border-2 border-black/20 border-t-black/60 dark:border-white/20 dark:border-t-white/60 ${className}`}
        />
    );
}
