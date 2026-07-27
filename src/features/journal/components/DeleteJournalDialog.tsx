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
 */
export function DeleteJournalDialog({ id, title, onClose }: DeleteJournalDialogProps) {
    const headingId = useId();
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape" && !isPending) {
                onClose();
            }
        }

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [onClose, isPending]);

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
                    Delete this journal entry?
                </h2>
                <p className="mb-4 text-sm text-black/60 dark:text-white/60">
                    &ldquo;{title}&rdquo; will be permanently deleted. This cannot be undone.
                </p>

                {error && (
                    <p role="alert" className="mb-4 text-sm text-red-600 dark:text-red-400">
                        {error}
                    </p>
                )}

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
                        onClick={handleDelete}
                        disabled={isPending}
                        className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-red-500"
                    >
                        {isPending ? "Deleting…" : "Delete"}
                    </button>
                </div>
            </div>
        </div>
    );
}
