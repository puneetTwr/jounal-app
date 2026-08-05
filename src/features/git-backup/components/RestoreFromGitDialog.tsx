"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useTransition } from "react";
import { restoreFromGit, type GitRestoreResult } from "../actions";

interface RestoreFromGitDialogProps {
    onClose: () => void;
    onResult: (result: GitRestoreResult) => void;
}

/**
 * Confirmation modal for pulling the content root's Git history down
 * into the local working tree. restoreFromGit() never throws (it
 * reports every outcome, including failures, via its returned status —
 * see GitRestoreService), so this dialog's only job is to run it and
 * hand the result to the button, which owns displaying it; a defensive
 * catch covers a genuinely unexpected exception the same way. It
 * always closes once a result comes back — unlike DeleteJournalDialog,
 * there's no navigation away from this page to fold that into.
 */
export function RestoreFromGitDialog({ onClose, onResult }: RestoreFromGitDialogProps) {
    const headingId = useId();
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape" && !isPending) {
                onClose();
            }
        }

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [onClose, isPending]);

    function handleRestore() {
        if (isPending) {
            return;
        }

        startTransition(async () => {
            let result: GitRestoreResult;

            try {
                result = await restoreFromGit();
            } catch {
                result = { status: "error" };
            }

            onResult(result);

            if (result.status === "success") {
                router.refresh();
            }

            onClose();
        });
    }

    function handleBackdropClick() {
        if (!isPending) {
            onClose();
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div role="presentation" className="absolute inset-0 bg-black/50" onClick={handleBackdropClick} />
            <div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby={headingId}
                className="relative w-full max-w-sm rounded-lg bg-white p-6 shadow-lg dark:bg-neutral-900"
            >
                <h2 id={headingId} className="mb-2 text-lg font-semibold">
                    Restore from Git?
                </h2>
                <p className="mb-4 text-sm text-black/60 dark:text-white/60">
                    This pulls the latest backup down from Git and merges it into your local journals. Any
                    unsaved local changes are committed locally first, so nothing on disk is lost — but if the
                    same file changed in both places, the restore stops and asks you to resolve it manually
                    instead of guessing.
                </p>

                <div className="flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isPending}
                        className="rounded px-4 py-2 text-sm font-medium hover:bg-black/5 disabled:opacity-50 dark:hover:bg-white/10"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleRestore}
                        disabled={isPending}
                        className="rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
                    >
                        {isPending ? "Restoring…" : "Restore"}
                    </button>
                </div>
            </div>
        </div>
    );
}
