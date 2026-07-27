"use client";

import { useState } from "react";
import type { JournalEntry } from "../types";
import { JournalBodyEditor } from "./JournalBodyEditor";
import { JournalMetadataEditor } from "./JournalMetadataEditor";

interface JournalDetailProps {
    entry: JournalEntry;
}

/**
 * Composes the metadata editor and the Markdown body editor for a
 * single journal entry. The two are fully independent editing sessions
 * (separate field state, separate dirty tracking, separate Save
 * buttons/feedback) — the only thing they share is the page's one
 * "Back to Journals" link and its one unsaved-changes guard, both owned
 * by JournalBodyEditor. This component's only job is lifting the
 * metadata editor's dirty flag up so it can be passed into
 * JournalBodyEditor as `isMetadataDirty`, so that link/guard accounts
 * for unsaved metadata changes too, not just unsaved body changes.
 *
 * This is now a Client Component (it wasn't before): coordinating two
 * sibling client islands' dirty state requires state above both of
 * them. There's no longer a server-rendering benefit being traded away
 * by that — JournalMetadata (this page's previous read-only, zero-JS
 * metadata display) has been superseded here by JournalMetadataEditor,
 * which is inherently an interactive client-side form either way.
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
        </article>
    );
}
