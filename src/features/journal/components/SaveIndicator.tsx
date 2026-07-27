export type SaveStatus = "idle" | "saving" | "saved" | "error";

interface SaveIndicatorProps {
    status: SaveStatus;
    errorMessage?: string | null;
}

/**
 * Clear, non-blocking feedback for the body editor's save state —
 * "Saving…", "Saved", or a friendly error — rendered as ordinary page
 * content rather than a browser alert() so it doesn't block input and
 * is available to assistive technology via role="status"/"alert".
 * Renders nothing while idle.
 */
export function SaveIndicator({ status, errorMessage }: SaveIndicatorProps) {
    if (status === "idle") {
        return null;
    }

    if (status === "saving") {
        return (
            <p role="status" className="text-sm text-black/60 dark:text-white/60">
                Saving…
            </p>
        );
    }

    if (status === "saved") {
        return (
            <p role="status" className="text-sm text-green-700 dark:text-green-400">
                Saved
            </p>
        );
    }

    return (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {errorMessage ?? "Something went wrong while saving."}
        </p>
    );
}
