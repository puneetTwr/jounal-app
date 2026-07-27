"use client";

import { useState } from "react";
import type { JournalEntry } from "../types";
import { DeleteJournalButton } from "./DeleteJournalButton";
import { JournalBodyEditor } from "./JournalBodyEditor";
import { JournalMetadataEditor } from "./JournalMetadataEditor";

interface JournalDetailProps {
    entry: JournalEntry;
}

/**
 * Composes the metadata editor, the Markdown body editor, and the
 * delete action for a single journal entry. The two editors are fully
 * independent editing sessions (separate field state, separate dirty
 * tracking, separate Save buttons/feedback) — the only thing they
 * share is the page's one "Back to Journals" link and its one
 * unsaved-changes guard, both owned by JournalBodyEditor. This
 * component's only job is lifting the metadata editor's dirty flag up
 * so it can be passed into JournalBodyEditor as `isMetadataDirty`, so
 * that link/guard accounts for unsaved metadata changes too, not just
 * unsaved body changes.
 *
 * Delete is rendered in its own separated row at the bottom, away from
 * both Save buttons, to reduce the chance of an accidental click on a
 * destructive action next to a routine one.
 *
 * This is a Client Component (it wasn't originally): coordinating two
 * sibling client islands' dirty state requires state above both of
 * them. There's no server-rendering benefit being traded away by that
 * — JournalMetadata (this page's original read-only, zero-JS metadata
 * display) has been superseded here by JournalMetadataEditor, which is
 * inherently an interactive client-side form either way.
 */
export function JournalDetail({ entry }: JournalDetailProps) {
    const [isMetadataDirty, setIsMetadataDirty] = useState(false);

    return (
        <article className="flex flex-col gap-6">
            <JournalMetadataEditor entry={entry} onDirtyChange={setIsMetadataDirty} />

            <JournalBodyEditor
                id={entry.frontMatter.id}
                initialContent={entry.content}
                isMetadataDirty={isMetadataDirty}
            />

            <div className="flex justify-end border-t border-black/10 pt-4 dark:border-white/15">
                <DeleteJournalButton id={entry.frontMatter.id} title={entry.frontMatter.title} />
            </div>
        </article>
    );
}
