"use client";

import { useEffect, useId } from "react";
import { CreateJournalForm } from "./CreateJournalForm";

interface CreateJournalDialogProps {
    onClose: () => void;
}

/** Modal shell hosting CreateJournalForm. Closes on Escape or backdrop click. */
export function CreateJournalDialog({ onClose }: CreateJournalDialogProps) {
    const headingId = useId();

    useEffect(() => {
        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                onClose();
            }
        }

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div role="presentation" className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={headingId}
                className="relative w-full max-w-sm rounded-lg bg-white p-6 shadow-lg dark:bg-neutral-900"
            >
                <h2 id={headingId} className="mb-4 text-lg font-semibold">
                    New Journal
                </h2>
                <CreateJournalForm onCancel={onClose} />
            </div>
        </div>
    );
}
