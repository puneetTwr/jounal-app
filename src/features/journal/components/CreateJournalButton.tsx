"use client";

import { AlertCircle, Loader2, Plus } from "lucide-react";
import { useCallback, useEffect, useState, useTransition } from "react";
import { createJournal } from "../actions/createJournal";

/** Today's date as a local YYYY-MM-DD string, matching what the create action expects. */
function todayAsIsoDate(): string {
    const now = new Date();
    const year = String(now.getFullYear()).padStart(4, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

/** Whether `target` is a place the user is already typing — the "n" shortcut must not fire while it would just get typed as a letter. */
function isEditableTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) {
        return false;
    }

    return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

/**
 * Creates a new, blank journal entry immediately on click (or pressing
 * "n" anywhere outside a text field) and redirects straight into its
 * editor — no intermediate form. Every field the old form used to
 * collect already defaults sensibly server-side (a blank title becomes
 * today's date written as an ordinal, e.g. "5th August 2026"; a blank
 * template leaves the body empty), so there's nothing that actually
 * needs asking before writing can start. Title/tags/date can still be
 * changed afterward from the metadata panel, and a template can still
 * be inserted from the editor (see InsertTemplateControl) — this
 * button just removes the detour through a dialog to reach a decision
 * every field already makes for you.
 *
 * createJournal() redirects on success (thrown internally by
 * next/navigation's redirect()), so the only case that reaches
 * `errorMessage` here is a genuine, rare failure — a filesystem error,
 * for instance — not a validation problem, since every field this
 * button supplies is always well-formed.
 */
export function CreateJournalButton() {
    const [isPending, startTransition] = useTransition();
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleClick = useCallback(() => {
        if (isPending) {
            return;
        }

        setErrorMessage(null);

        startTransition(async () => {
            const formData = new FormData();
            formData.set("title", "");
            formData.set("journalDate", todayAsIsoDate());
            formData.set("templateId", "");

            const result = await createJournal({ errors: {} }, formData);
            setErrorMessage(
                result.errors.form ?? result.errors.journalDate ?? "Something went wrong. Please try again."
            );
        });
    }, [isPending]);

    useEffect(() => {
        function handleKeyDown(event: KeyboardEvent) {
            if (
                event.key.toLowerCase() !== "n" ||
                event.ctrlKey ||
                event.metaKey ||
                event.altKey ||
                isEditableTarget(event.target)
            ) {
                return;
            }

            event.preventDefault();
            handleClick();
        }

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [handleClick]);

    return (
        <div className="flex items-center gap-3">
            {errorMessage && (
                <p role="alert" className="flex items-center gap-1.5 text-meta text-danger">
                    <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                    {errorMessage}
                </p>
            )}
            <button
                type="button"
                onClick={handleClick}
                disabled={isPending}
                title="New Journal (n)"
                className="flex items-center gap-1.5 rounded bg-accent px-4 py-2 text-body font-medium text-accent-foreground disabled:opacity-50"
            >
                {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                    <Plus className="h-4 w-4" aria-hidden="true" />
                )}
                New Journal
            </button>
        </div>
    );
}
