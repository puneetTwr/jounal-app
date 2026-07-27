"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { updateJournalMetadata, type UpdateJournalMetadataErrors } from "../actions/updateJournalMetadata";
import type { JournalEntry } from "../types";
import { MetadataPanel, type MetadataFormValues } from "./MetadataPanel";
import { SaveIndicator, type SaveStatus } from "./SaveIndicator";

interface JournalMetadataEditorProps {
    entry: JournalEntry;
    /** Reports this editor's dirty state upward so JournalBodyEditor's shared nav guard can account for it. */
    onDirtyChange?: (isDirty: boolean) => void;
}

function toFormValues(entry: JournalEntry): MetadataFormValues {
    return {
        title: entry.frontMatter.title,
        journalDate: entry.frontMatter.journalDate,
        tags: entry.frontMatter.tags,
        favorite: entry.frontMatter.favorite,
        pinned: entry.frontMatter.pinned,
        archived: entry.frontMatter.archived,
    };
}

function areValuesEqual(a: MetadataFormValues, b: MetadataFormValues): boolean {
    return (
        a.title === b.title &&
        a.journalDate === b.journalDate &&
        a.favorite === b.favorite &&
        a.pinned === b.pinned &&
        a.archived === b.archived &&
        a.tags.length === b.tags.length &&
        a.tags.every((tag, index) => tag === b.tags[index])
    );
}

/**
 * Owns the metadata editing session for a single journal entry: field
 * state, dirty tracking (independent of the Markdown body editor), the
 * Save action, and save-state feedback. Deliberately mirrors
 * JournalBodyEditor's shape so the two save flows behave consistently
 * even though they're otherwise fully independent.
 *
 * `isDirty` is derived (values compared against the last-saved values)
 * rather than tracked as a separate flag, matching JournalBodyEditor's
 * approach — it can never drift out of sync with what's actually saved.
 */
export function JournalMetadataEditor({ entry, onDirtyChange }: JournalMetadataEditorProps) {
    const [values, setValues] = useState<MetadataFormValues>(() => toFormValues(entry));
    const [savedValues, setSavedValues] = useState<MetadataFormValues>(() => toFormValues(entry));
    const [status, setStatus] = useState<SaveStatus>("idle");
    const [errors, setErrors] = useState<UpdateJournalMetadataErrors>({});
    const [isPending, startTransition] = useTransition();

    const isDirty = !areValuesEqual(values, savedValues);

    useEffect(() => {
        onDirtyChange?.(isDirty);
    }, [isDirty, onDirtyChange]);

    const handleChange = useCallback((nextValues: MetadataFormValues) => {
        setValues(nextValues);
        setStatus("idle");
        setErrors({});
    }, []);

    const handleSave = useCallback(() => {
        startTransition(async () => {
            setStatus("saving");
            setErrors({});

            const result = await updateJournalMetadata({
                id: entry.frontMatter.id,
                ...values,
            });

            if (result.status === "error") {
                setStatus("error");
                setErrors(result.errors ?? {});
                return;
            }

            setSavedValues(values);
            setStatus("saved");
        });
    }, [entry.frontMatter.id, values]);

    return (
        <section className="flex flex-col gap-4 rounded-lg border border-black/10 p-4 dark:border-white/15">
            <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-black/60 dark:text-white/60">Details</h2>
                <div className="flex items-center gap-3">
                    <SaveIndicator status={status} errorMessage={errors.form} />
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

            <MetadataPanel
                values={values}
                onChange={handleChange}
                disabled={isPending}
                titleError={errors.title}
                journalDateError={errors.journalDate}
            />
        </section>
    );
}
