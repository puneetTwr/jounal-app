"use client";

import { Trash2 } from "lucide-react";
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
                className="flex items-center gap-1.5 rounded border border-danger/40 px-4 py-2 text-body font-medium text-danger hover:bg-danger/10"
            >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Delete Journal
            </button>
            {isDialogOpen && <DeleteJournalDialog id={id} title={title} onClose={() => setIsDialogOpen(false)} />}
        </>
    );
}
