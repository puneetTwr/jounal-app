"use client";

import { useState } from "react";
import type { JournalEntry } from "../types";
import { DeleteJournalButton } from "./DeleteJournalButton";
import { JournalBodyEditor } from "./JournalBodyEditor";
import { JournalMetadataEditor } from "./JournalMetadataEditor";
import type { SaveStatus } from "./SaveIndicator";

interface JournalDetailProps {
    entry: JournalEntry;
}

/**
 * Combines the metadata and body editors' independent save statuses
 * into the one indicator actually shown to the user: an error from
 * either side wins (and is surfaced), otherwise "saving" beats "saved"
 * beats "idle" — so the indicator always reflects whichever editor is
 * least settled, rather than only ever showing one editor's state.
 */
function combineSaveStatus(
    a: { status: SaveStatus; errorMessage?: string | null },
    b: { status: SaveStatus; errorMessage?: string | null }
): { status: SaveStatus; errorMessage?: string | null } {
    if (a.status === "error") return a;
    if (b.status === "error") return b;
    if (a.status === "saving" || b.status === "saving") return { status: "saving" };
    if (a.status === "saved" || b.status === "saved") return { status: "saved" };
    return { status: "idle" };
}

/**
 * Composes the metadata editor, the Markdown body editor, and the
 * delete action for a single journal entry. The two editors are fully
 * independent autosaving sessions (separate field state, separate
 * dirty tracking, separate Server Actions) — this component's job is
 * lifting both their dirty flags and save statuses up so:
 *  - JournalBodyEditor's shared "Back to Journals" nav guard accounts
 *    for unsaved metadata changes too, not just unsaved body changes.
 *  - One shared SaveIndicator (rendered inside JournalBodyEditor, next
 *    to "Back to Journals") reflects both editors at once, instead of
 *    each editor showing its own — there is no manual Save button
 *    anywhere on this page; both editors save automatically.
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
 * This is a Client Component: coordinating two sibling client islands'
 * dirty/status state requires state above both of them.
 */
export function JournalDetail({ entry }: JournalDetailProps) {
    const [isMetadataDirty, setIsMetadataDirty] = useState(false);
    const [metadataSave, setMetadataSave] = useState<{ status: SaveStatus; errorMessage?: string | null }>({
        status: "idle",
    });
    const [bodySave, setBodySave] = useState<{ status: SaveStatus; errorMessage?: string | null }>({
        status: "idle",
    });

    const sharedSave = combineSaveStatus(metadataSave, bodySave);

    return (
        <article className="flex flex-col gap-8 md:flex-row md:items-start md:gap-12">
            <div className="flex flex-col gap-4 md:w-[360px] md:flex-none">
                <JournalMetadataEditor
                    entry={entry}
                    onDirtyChange={setIsMetadataDirty}
                    onStatusChange={(status, errorMessage) => setMetadataSave({ status, errorMessage })}
                />

                <div className="hidden justify-end border-t border-border pt-4 md:flex">
                    <DeleteJournalButton id={entry.frontMatter.id} title={entry.frontMatter.title} />
                </div>
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-6">
                <JournalBodyEditor
                    id={entry.frontMatter.id}
                    initialContent={entry.content}
                    frontMatter={entry.frontMatter}
                    isMetadataDirty={isMetadataDirty}
                    sharedStatus={sharedSave.status}
                    sharedErrorMessage={sharedSave.errorMessage}
                    onStatusChange={(status, errorMessage) => setBodySave({ status, errorMessage })}
                />

                <div className="flex justify-end border-t border-border pt-4 md:hidden">
                    <DeleteJournalButton id={entry.frontMatter.id} title={entry.frontMatter.title} />
                </div>
            </div>
        </article>
    );
}
