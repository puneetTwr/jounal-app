"use client";

import { useState } from "react";
import { CreateJournalDialog } from "./CreateJournalDialog";

/** Trigger for the journal creation flow: opens CreateJournalDialog on click. */
export function CreateJournalButton() {
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    return (
        <>
            <button
                type="button"
                aria-haspopup="dialog"
                onClick={() => setIsDialogOpen(true)}
                className="rounded bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
            >
                New Journal
            </button>
            {isDialogOpen && <CreateJournalDialog onClose={() => setIsDialogOpen(false)} />}
        </>
    );
}
