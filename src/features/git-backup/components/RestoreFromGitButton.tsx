"use client";

import { DownloadCloud } from "lucide-react";
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
 * Icon-only trigger (opens a confirmation dialog) for pulling the
 * content root's Git history down and merging it into the local
 * working tree. Demoted to a small, secondary affordance alongside
 * BackupToGitButton — same rationale: infrequent and shouldn't compete
 * visually with the page's primary action.
 */
export function RestoreFromGitButton({ isConfigured }: RestoreFromGitButtonProps) {
    const [status, setStatus] = useState<RestoreStatus>(isConfigured ? "idle" : "not-configured");
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    return (
        <div className="flex items-center gap-2">
            {status !== "idle" && (
                <p
                    role={ALERT_STATUSES.has(status) ? "alert" : "status"}
                    className={
                        ALERT_STATUSES.has(status) ? "text-meta text-danger" : "text-meta text-muted-foreground"
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
                title="Restore from Git"
                aria-label="Restore from Git"
                className="rounded-full p-2 text-muted-foreground hover:bg-muted-foreground/10 hover:text-foreground disabled:opacity-50"
            >
                <DownloadCloud className="h-4 w-4" aria-hidden="true" />
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
