"use client";

import { useState } from "react";
import { DeleteJournalDialog } from "./DeleteJournalDialog";

interface DeleteJournalButtonProps {
    id: string;
    title: string;
}

/** Trigger for the delete-journal flow: opens DeleteJournalDialog on click. Deletion never happens immediately. */
export function DeleteJournalButton({ id, title }: DeleteJournalButtonProps) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    return (
        <>
            <button
                type="button"
                aria-haspopup="dialog"
                onClick={() => setIsDialogOpen(true)}
                className="rounded border border-red-600 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-500 dark:text-red-400 dark:hover:bg-red-950/40"
            >
                Delete Journal
            </button>
            {isDialogOpen && <DeleteJournalDialog id={id} title={title} onClose={() => setIsDialogOpen(false)} />}
        </>
    );
}
