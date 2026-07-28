import { Spinner } from "./Spinner";

interface FullPageLoaderProps {
    label?: string;
}

/**
 * A centered loading state for an entire route or panel — e.g. a
 * future Next.js `loading.tsx` route boundary, or a full-page
 * Suspense fallback. Not currently wired into any route; provided so
 * the next feature that needs a page-level loading state doesn't
 * reinvent one.
 */
export function FullPageLoader({ label = "Loading…" }: FullPageLoaderProps) {
    return (
        <div
            role="status"
            className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-black/60 dark:text-white/60"
        >
            <Spinner className="h-6 w-6" label={label} />
            <p className="text-sm">{label}</p>
        </div>
    );
}
