"use client";

import { ArrowLeft, Eye, Pencil } from "lucide-react";
import Link from "next/link";
import { type MouseEvent, useCallback, useEffect, useRef, useState, useTransition } from "react";
import { updateJournalContent } from "../actions/updateJournalContent";
import { JOURNAL_LIST_PATH } from "../actions/paths";
import { AUTOSAVE_DEBOUNCE_MS } from "./autosaveConfig";
import { InsertTemplateControl } from "./InsertTemplateControl";
import { JournalContentView } from "./JournalContentView";
import { MarkdownEditor } from "./MarkdownEditor";
import { SaveIndicator, type SaveStatus } from "./SaveIndicator";
import { UnsavedChangesGuard } from "./UnsavedChangesGuard";

interface JournalBodyEditorProps {
    id: string;
    initialContent: string;
    /** Passed straight through to InsertTemplateControl to resolve `{{...}}` template variables if a template is inserted. */
    frontMatter: {
        title: string;
        journalDate: string;
        createdAt: string;
        updatedAt: string;
    };
    /**
     * Whether the sibling metadata editor (JournalMetadataEditor) has
     * unsaved changes. This component owns the page's one "Back to
     * Journals" link and its one unsaved-changes guard, so it needs to
     * know about metadata's dirty state too, not just its own — without
     * this, editing the title/tags and clicking "Back to Journals"
     * would silently discard that work with no warning. Editing/saving
     * behavior for the Markdown body itself is unchanged.
     */
    isMetadataDirty?: boolean;
    /** Combined save status across both editors, owned and computed by JournalDetail — this is the one indicator actually shown, next to "Back to Journals". */
    sharedStatus: SaveStatus;
    sharedErrorMessage?: string | null;
    /** Reports this editor's own save status upward so JournalDetail can fold it into `sharedStatus`. */
    onStatusChange?: (status: SaveStatus, errorMessage?: string | null) => void;
}

const UNSAVED_CHANGES_PROMPT = "You have unsaved changes. Leave without saving?";

/**
 * Owns the Markdown body editing session for a single journal entry:
 * dirty tracking, autosave, and unsaved-changes protection. `isDirty`
 * is derived (content !== savedContent) rather than tracked as a
 * separate flag, so it can never drift out of sync with what's
 * actually been saved.
 *
 * A save sequence number guards against out-of-order responses, same
 * reasoning as JournalMetadataEditor: a newer autosave's result always
 * wins over an older one that resolves later.
 */
export function JournalBodyEditor({
    id,
    initialContent,
    frontMatter,
    isMetadataDirty = false,
    sharedStatus,
    sharedErrorMessage,
    onStatusChange,
}: JournalBodyEditorProps) {
    const [content, setContent] = useState(initialContent);
    const [savedContent, setSavedContent] = useState(initialContent);
    const [status, setStatus] = useState<SaveStatus>("idle");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [, startTransition] = useTransition();
    const saveSeqRef = useRef(0);

    // Opening an existing entry lands on the rendered, read-only view;
    // the Markdown editor only mounts once the user clicks Edit. A blank
    // entry has nothing to render, so it skips straight to editing.
    const [mode, setMode] = useState<"view" | "edit">(() =>
        initialContent.trim().length === 0 ? "edit" : "view"
    );

    const isDirty = content !== savedContent;
    const hasAnyUnsavedChanges = isDirty || isMetadataDirty;

    useEffect(() => {
        onStatusChange?.(status, errorMessage);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status, errorMessage]);

    const handleContentChange = useCallback((nextValue?: string) => {
        setContent(nextValue ?? "");
        setStatus("idle");
        setErrorMessage(null);
    }, []);

    const handleSave = useCallback(() => {
        const mySeq = ++saveSeqRef.current;

        startTransition(async () => {
            setStatus("saving");
            setErrorMessage(null);

            const result = await updateJournalContent(id, content);

            if (mySeq !== saveSeqRef.current) {
                return;
            }

            if (result.status === "error") {
                setStatus("error");
                setErrorMessage(result.error ?? null);
                return;
            }

            setSavedContent(content);
            setStatus("saved");
        });
    }, [id, content]);

    useEffect(() => {
        if (!isDirty) {
            return;
        }

        const timeoutId = setTimeout(handleSave, AUTOSAVE_DEBOUNCE_MS);
        return () => clearTimeout(timeoutId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [content]);

    const handleBackLinkClick = useCallback(
        (event: MouseEvent<HTMLAnchorElement>) => {
            if (hasAnyUnsavedChanges && !window.confirm(UNSAVED_CHANGES_PROMPT)) {
                event.preventDefault();
            }
        },
        [hasAnyUnsavedChanges]
    );

    return (
        <div className="flex flex-col gap-6">
            <UnsavedChangesGuard isDirty={hasAnyUnsavedChanges} />

            <div className="flex items-center justify-between gap-2">
                <Link
                    href={JOURNAL_LIST_PATH}
                    onClick={handleBackLinkClick}
                    className="flex w-fit items-center gap-1 text-body font-medium text-muted-foreground hover:text-foreground hover:underline"
                >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    Back to Journals
                </Link>

                <div className="flex items-center gap-4">
                    <SaveIndicator status={sharedStatus} errorMessage={sharedErrorMessage} />

                    {mode === "view" ? (
                        <button
                            type="button"
                            onClick={() => setMode("edit")}
                            className="flex items-center gap-1.5 text-body font-medium text-muted-foreground hover:text-accent"
                        >
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                            Edit
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setMode("view")}
                            className="flex items-center gap-1.5 text-body font-medium text-muted-foreground hover:text-accent"
                        >
                            <Eye className="h-4 w-4" aria-hidden="true" />
                            Done
                        </button>
                    )}
                </div>
            </div>

            {mode === "edit" && content.trim().length === 0 && (
                <InsertTemplateControl frontMatter={frontMatter} onInsert={handleContentChange} />
            )}

            {mode === "view" ? (
                <JournalContentView content={content} />
            ) : (
                <MarkdownEditor value={content} onChange={handleContentChange} />
            )}
        </div>
    );
}
