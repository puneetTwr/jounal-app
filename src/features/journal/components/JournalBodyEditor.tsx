"use client";

import Link from "next/link";
import { type MouseEvent, type ReactNode, useCallback, useState, useTransition } from "react";
import { updateJournalContent } from "../actions/updateJournalContent";
import { JOURNAL_LIST_PATH } from "../actions/paths";
import { MarkdownEditor } from "./MarkdownEditor";
import { SaveIndicator, type SaveStatus } from "./SaveIndicator";
import { UnsavedChangesGuard } from "./UnsavedChangesGuard";

interface JournalBodyEditorProps {
    id: string;
    initialContent: string;
    /**
     * Rendered between the nav/save row and the editor — used to slot
     * in JournalMetadata (a Server Component) without this Client
     * Component needing to import it directly.
     */
    children: ReactNode;
}

const UNSAVED_CHANGES_PROMPT = "You have unsaved changes. Leave without saving?";

/**
 * Owns the Markdown body editing session for a single journal entry:
 * dirty tracking, the Save action, save-state feedback, and unsaved-
 * changes protection. `isDirty` is derived (content !== savedContent)
 * rather than tracked as a separate flag, so it can never drift out of
 * sync with what's actually been saved.
 */
export function JournalBodyEditor({ id, initialContent, children }: JournalBodyEditorProps) {
    const [content, setContent] = useState(initialContent);
    const [savedContent, setSavedContent] = useState(initialContent);
    const [status, setStatus] = useState<SaveStatus>("idle");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const isDirty = content !== savedContent;

    const handleContentChange = useCallback((nextValue?: string) => {
        setContent(nextValue ?? "");
        setStatus("idle");
        setErrorMessage(null);
    }, []);

    const handleSave = useCallback(() => {
        startTransition(async () => {
            setStatus("saving");
            setErrorMessage(null);

            const result = await updateJournalContent(id, content);

            if (result.status === "error") {
                setStatus("error");
                setErrorMessage(result.error ?? null);
                return;
            }

            setSavedContent(content);
            setStatus("saved");
        });
    }, [id, content]);

    const handleBackLinkClick = useCallback(
        (event: MouseEvent<HTMLAnchorElement>) => {
            if (isDirty && !window.confirm(UNSAVED_CHANGES_PROMPT)) {
                event.preventDefault();
            }
        },
        [isDirty]
    );

    return (
        <div className="flex flex-col gap-6">
            <UnsavedChangesGuard isDirty={isDirty} />

            <div className="flex items-center justify-between gap-2">
                <Link
                    href={JOURNAL_LIST_PATH}
                    onClick={handleBackLinkClick}
                    className="w-fit text-sm font-medium text-black/60 hover:underline dark:text-white/60"
                >
                    ← Back to Journals
                </Link>

                <div className="flex items-center gap-3">
                    <SaveIndicator status={status} errorMessage={errorMessage} />
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={!isDirty || isPending}
                        className="rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
                    >
                        {isPending ? "Saving…" : "Save"}
                    </button>
                </div>
            </div>

            {children}

            <MarkdownEditor value={content} onChange={handleContentChange} />
        </div>
    );
}
