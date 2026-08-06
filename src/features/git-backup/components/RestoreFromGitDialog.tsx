"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useState, useTransition } from "react";
import { restoreFromGit, type GitRestoreResult } from "../actions";

interface RestoreFromGitDialogProps {
    onClose: () => void;
    onResult: (result: GitRestoreResult) => void;
}

/** Enter/exit transition duration for the dialog's fade+scale — matches DeleteJournalDialog's. */
const TRANSITION_MS = 150;

/**
 * Confirmation modal for pulling the content root's Git history down
 * into the local working tree. restoreFromGit() never throws (it
 * reports every outcome, including failures, via its returned status —
 * see GitRestoreService), so this dialog's only job is to run it and
 * hand the result to the button, which owns displaying it; a defensive
 * catch covers a genuinely unexpected exception the same way. It
 * always closes once a result comes back — unlike DeleteJournalDialog,
 * there's no navigation away from this page to fold that into.
 *
 * Fades/scales in on mount and, since a removed element can't
 * transition, fades/scales out first via `requestClose()` — which
 * flips `isVisible` off and only actually unmounts (calling the real
 * `onClose`) after `TRANSITION_MS`. The global `prefers-reduced-motion`
 * rule in globals.css already collapses this to near-instant for
 * anyone who's asked for that.
 */
export function RestoreFromGitDialog({ onClose, onResult }: RestoreFromGitDialogProps) {
    const headingId = useId();
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const frame = requestAnimationFrame(() => setIsVisible(true));
        return () => cancelAnimationFrame(frame);
    }, []);

    function requestClose() {
        setIsVisible(false);
        setTimeout(onClose, TRANSITION_MS);
    }

    useEffect(() => {
        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape" && !isPending) {
                requestClose();
            }
        }

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isPending]);

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

            requestClose();
        });
    }

    function handleBackdropClick() {
        if (!isPending) {
            requestClose();
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                role="presentation"
                className={`absolute inset-0 bg-black/50 transition-opacity duration-150 ${isVisible ? "opacity-100" : "opacity-0"}`}
                onClick={handleBackdropClick}
            />
            <div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby={headingId}
                className={`relative w-full max-w-sm rounded-lg bg-surface-elevated p-6 shadow-lg transition-[opacity,transform] duration-150 ${
                    isVisible ? "scale-100 opacity-100" : "scale-95 opacity-0"
                }`}
            >
                <h2 id={headingId} className="mb-2 text-heading font-semibold">
                    Restore from Git?
                </h2>
                <p className="mb-4 text-body text-muted-foreground">
                    This pulls the latest backup down from Git and merges it into your local journals. Any
                    unsaved local changes are committed locally first, so nothing on disk is lost — but if the
                    same file changed in both places, the restore stops and asks you to resolve it manually
                    instead of guessing.
                </p>

                <div className="flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={requestClose}
                        disabled={isPending}
                        className="rounded px-4 py-2 text-body font-medium hover:bg-muted-foreground/10 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleRestore}
                        disabled={isPending}
                        className="rounded bg-accent px-4 py-2 text-body font-medium text-accent-foreground disabled:opacity-50"
                    >
                        {isPending ? "Restoring…" : "Restore"}
                    </button>
                </div>
            </div>
        </div>
    );
}
