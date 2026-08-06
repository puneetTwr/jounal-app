"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useState, useTransition } from "react";
import { deleteJournal } from "../actions/deleteJournal";
import { JOURNAL_LIST_PATH } from "../actions/paths";

interface DeleteJournalDialogProps {
    id: string;
    title: string;
    onClose: () => void;
}

/** Enter/exit transition duration for the dialog's fade+scale — matches RestoreFromGitDialog's. */
const TRANSITION_MS = 150;

/**
 * Confirmation modal for deleting a journal entry.
 *
 * Calls the existing deleteJournal Server Action directly, unmodified —
 * it already goes through JournalService/JournalRepository and already
 * revalidates only the affected routes (the journal list and this
 * entry's own detail route). deleteJournal throws raw errors rather
 * than returning a structured result; this dialog catches at the call
 * site and never surfaces the caught error's message, only a fixed
 * friendly string, so no repository/filesystem detail ever reaches
 * the UI.
 *
 * `isPending` guards against duplicate submissions (checked before
 * starting, and both buttons/Escape/backdrop are disabled while a
 * delete is in flight) and drives the Delete button's loading label.
 *
 * Fades/scales in on mount and, since a removed element can't
 * transition, fades/scales out first via `requestClose()` — which
 * flips `isVisible` off and only actually unmounts (calling the real
 * `onClose`) after `TRANSITION_MS`. The global `prefers-reduced-motion`
 * rule in globals.css already collapses this to near-instant for
 * anyone who's asked for that.
 */
export function DeleteJournalDialog({ id, title, onClose }: DeleteJournalDialogProps) {
    const headingId = useId();
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
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

    function handleDelete() {
        if (isPending) {
            return;
        }

        setError(null);

        startTransition(async () => {
            try {
                await deleteJournal(id);
                router.replace(JOURNAL_LIST_PATH);
            } catch {
                setError("Something went wrong while deleting this journal entry. Please try again.");
            }
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
                    Delete this journal entry?
                </h2>
                <p className="mb-4 text-body text-muted-foreground">
                    &ldquo;{title}&rdquo; will be permanently deleted. This cannot be undone.
                </p>

                {error && (
                    <p role="alert" className="mb-4 text-body text-danger">
                        {error}
                    </p>
                )}

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
                        onClick={handleDelete}
                        disabled={isPending}
                        className="rounded bg-danger px-4 py-2 text-body font-medium text-white disabled:opacity-50"
                    >
                        {isPending ? "Deleting…" : "Delete"}
                    </button>
                </div>
            </div>
        </div>
    );
}
