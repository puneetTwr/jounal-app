"use client";

import { useEffect } from "react";

interface UnsavedChangesGuardProps {
    isDirty: boolean;
}

/**
 * Warns the user via the browser's native beforeunload prompt when
 * leaving the page (closing the tab, refreshing, or typing a new URL)
 * while there are unsaved changes. Renders nothing.
 *
 * In-app navigation via the page's own "Back to Journals" link is
 * guarded separately, directly on that link's click handler (see
 * JournalBodyEditor) — the Next.js App Router does not currently
 * expose a supported way to intercept client-side route changes
 * generically, so this component only covers navigation the browser
 * itself controls.
 */
export function UnsavedChangesGuard({ isDirty }: UnsavedChangesGuardProps) {
    useEffect(() => {
        if (!isDirty) {
            return;
        }

        function handleBeforeUnload(event: BeforeUnloadEvent) {
            event.preventDefault();
            // Legacy browsers require returnValue to be set to show the prompt.
            event.returnValue = "";
        }

        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [isDirty]);

    return null;
}
