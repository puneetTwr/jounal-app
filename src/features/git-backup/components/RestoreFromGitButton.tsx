"use client";

import { useState } from "react";
import type { GitRestoreResult } from "../actions";
import { RestoreFromGitDialog } from "./RestoreFromGitDialog";

type RestoreStatus = GitRestoreResult["status"] | "idle";

interface RestoreFromGitButtonProps {
    /** Whether both Git backup env vars were set at page load — determines the button's initial state. */
    isConfigured: boolean;
}

const STATUS_MESSAGES: Record<Exclude<RestoreStatus, "idle">, string> = {
    success: "Restored from Git.",
    "up-to-date": "Already up to date — nothing to restore.",
    conflict:
        "Restore couldn't complete automatically — the same file changed in both places. Resolve it with a Git client outside the app, then try again.",
    "not-configured":
        "Git backup isn't configured. Set JOURNAL_CONTENT_GIT_REMOTE_URL and JOURNAL_CONTENT_GIT_TOKEN to enable it.",
    "in-progress": "Another Git operation is already in progress. Try again shortly.",
    error: "Something went wrong while restoring. Please try again.",
};

const ALERT_STATUSES: ReadonlySet<RestoreStatus> = new Set(["conflict", "error"]);

/**
 * Opens a confirmation dialog, then triggers a one-shot pull-and-merge
 * of the content root's Git history into the local working tree. Shows
 * a clear, permanent explanation (rather than hiding the button) when
 * the feature isn't configured yet, mirroring BackupToGitButton.
 */
export function RestoreFromGitButton({ isConfigured }: RestoreFromGitButtonProps) {
    const [status, setStatus] = useState<RestoreStatus>(isConfigured ? "idle" : "not-configured");
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    return (
        <div className="flex items-center gap-3">
            {status !== "idle" && (
                <p
                    role={ALERT_STATUSES.has(status) ? "alert" : "status"}
                    className={
                        ALERT_STATUSES.has(status)
                            ? "text-sm text-red-600 dark:text-red-400"
                            : "text-sm text-black/60 dark:text-white/60"
                    }
                >
                    {STATUS_MESSAGES[status]}
                </p>
            )}
            <button
                type="button"
                aria-haspopup="dialog"
                onClick={() => setIsDialogOpen(true)}
                disabled={!isConfigured}
                className="rounded border border-black/20 px-4 py-2 text-sm font-medium disabled:opacity-50 dark:border-white/20"
            >
                Restore from Git
            </button>
            {isDialogOpen && (
                <RestoreFromGitDialog
                    onClose={() => setIsDialogOpen(false)}
                    onResult={(result) => setStatus(result.status)}
                />
            )}
        </div>
    );
}
