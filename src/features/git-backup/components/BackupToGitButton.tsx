"use client";

import { Loader2, UploadCloud } from "lucide-react";
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
 * Icon-only trigger for a one-shot Git backup of the entire content
 * root: stage everything, commit, push to the configured remote's
 * `main` branch. Deliberately demoted to a small, secondary affordance
 * (icon + tooltip/aria-label, not a full labeled button) so it never
 * competes visually with the page's actual primary action — this is
 * an infrequent, power-user operation, not something reached for daily.
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
        <div className="flex items-center gap-2">
            {status !== "idle" && (
                <p
                    role={status === "error" ? "alert" : "status"}
                    className={status === "error" ? "text-meta text-danger" : "text-meta text-muted-foreground"}
                >
                    {STATUS_MESSAGES[status]}
                </p>
            )}
            <button
                type="button"
                onClick={handleClick}
                disabled={!isConfigured || isPending}
                title="Backup to Git"
                aria-label="Backup to Git"
                className="rounded-full p-2 text-muted-foreground hover:bg-muted-foreground/10 hover:text-foreground disabled:opacity-50"
            >
                {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                    <UploadCloud className="h-4 w-4" aria-hidden="true" />
                )}
            </button>
        </div>
    );
}
