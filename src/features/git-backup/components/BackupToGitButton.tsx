"use client";

import { useCallback, useState, useTransition } from "react";
import { backupToGit, type GitBackupResult } from "../actions";

type BackupStatus = GitBackupResult["status"] | "idle";

interface BackupToGitButtonProps {
    /** Whether both Git backup env vars were set at page load — determines the button's initial state. */
    isConfigured: boolean;
}

const STATUS_MESSAGES: Record<Exclude<BackupStatus, "idle">, string> = {
    success: "Backed up.",
    "nothing-to-backup": "Nothing to back up — already up to date.",
    "not-configured":
        "Git backup isn't configured. Set JOURNAL_CONTENT_GIT_REMOTE_URL and JOURNAL_CONTENT_GIT_TOKEN to enable it.",
    "in-progress": "Another Git operation is already in progress. Try again shortly.",
    error: "Something went wrong while backing up. Please try again.",
};

/**
 * Triggers a one-shot Git backup of the entire content root: stage
 * everything, commit, push to the configured remote's `main` branch.
 * Shows a clear, permanent explanation (rather than hiding the button)
 * when the feature isn't configured yet, so a missing env var is easy
 * to notice and debug instead of looking like the feature is absent.
 */
export function BackupToGitButton({ isConfigured }: BackupToGitButtonProps) {
    const [status, setStatus] = useState<BackupStatus>(isConfigured ? "idle" : "not-configured");
    const [isPending, startTransition] = useTransition();

    const handleClick = useCallback(() => {
        startTransition(async () => {
            const result = await backupToGit();
            setStatus(result.status);
        });
    }, []);

    return (
        <div className="flex items-center gap-3">
            {status !== "idle" && (
                <p
                    role={status === "error" ? "alert" : "status"}
                    className={
                        status === "error"
                            ? "text-sm text-red-600 dark:text-red-400"
                            : "text-sm text-black/60 dark:text-white/60"
                    }
                >
                    {STATUS_MESSAGES[status]}
                </p>
            )}
            <button
                type="button"
                onClick={handleClick}
                disabled={!isConfigured || isPending}
                className="rounded border border-black/20 px-4 py-2 text-sm font-medium disabled:opacity-50 dark:border-white/20"
            >
                {isPending ? "Backing up…" : "Backup to Git"}
            </button>
        </div>
    );
}
