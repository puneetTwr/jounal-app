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
 * Layout: a fixed-width metadata column beside a flexing editor column
 * from `md` up (side-by-side; the editor gets the remaining width),
 * collapsing to the original stacked order below `md` — metadata,
 * then editor, then delete. DeleteJournalButton is rendered twice (one
 * per breakpoint, toggled with `hidden`/`md:hidden`) rather than
 * reordered with CSS, since its target position relative to the
 * metadata card flips between "beside it" (desktop) and "after the
 * editor" (mobile) — two different points in the DOM, not just a
 * different visual order of the same point. Both instances share the
 * same id/title props; only one is ever visible at a time.
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
        <article className="flex flex-col gap-8 md:flex-row md:items-start md:gap-12">
            <div className="flex flex-col gap-4 md:w-[360px] md:flex-none">
                <JournalMetadataEditor entry={entry} onDirtyChange={setIsMetadataDirty} />

                <div className="hidden justify-end border-t border-black/10 pt-4 md:flex dark:border-white/15">
                    <DeleteJournalButton id={entry.frontMatter.id} title={entry.frontMatter.title} />
                </div>
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-6">
                <JournalBodyEditor
                    id={entry.frontMatter.id}
                    initialContent={entry.content}
                    isMetadataDirty={isMetadataDirty}
                />

                <div className="flex justify-end border-t border-black/10 pt-4 md:hidden dark:border-white/15">
                    <DeleteJournalButton id={entry.frontMatter.id} title={entry.frontMatter.title} />
                </div>
            </div>
        </article>
    );
}
