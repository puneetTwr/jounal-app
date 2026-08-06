import { AlertCircle, Check, Loader2 } from "lucide-react";

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
            <p role="status" className="flex items-center gap-1.5 text-body text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                Saving…
            </p>
        );
    }

    if (status === "saved") {
        return (
            <p role="status" className="flex items-center gap-1.5 text-body text-success">
                <Check className="h-3.5 w-3.5 animate-[pop-in_150ms_ease-out]" aria-hidden="true" />
                Saved
            </p>
        );
    }

    return (
        <p role="alert" className="flex items-center gap-1.5 text-body text-danger">
            <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
            {errorMessage ?? "Something went wrong while saving."}
        </p>
    );
}
