"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { updateJournalMetadata, type UpdateJournalMetadataErrors } from "../actions/updateJournalMetadata";
import type { JournalEntry } from "../types";
import { AUTOSAVE_DEBOUNCE_MS } from "./autosaveConfig";
import { MetadataPanel, type MetadataFormValues } from "./MetadataPanel";
import type { SaveStatus } from "./SaveIndicator";

interface JournalMetadataEditorProps {
    entry: JournalEntry;
    /** Reports this editor's dirty state upward so JournalBodyEditor's shared nav guard can account for it. */
    onDirtyChange?: (isDirty: boolean) => void;
    /** Reports this editor's save status upward so JournalDetail can render one shared indicator for both editors. */
    onStatusChange?: (status: SaveStatus, formError?: string | null) => void;
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
 * state, dirty tracking (independent of the Markdown body editor), and
 * autosave. Deliberately mirrors JournalBodyEditor's shape so the two
 * save flows behave consistently even though they're otherwise fully
 * independent — each still calls its own existing Server Action with
 * its own validation/errors, autosave only changes *when* that call
 * happens, not what it does.
 *
 * `isDirty` is derived (values compared against the last-saved values)
 * rather than tracked as a separate flag, matching JournalBodyEditor's
 * approach — it can never drift out of sync with what's actually saved.
 *
 * A save sequence number guards against out-of-order responses: if a
 * newer autosave starts before an older one's request resolves, the
 * older response is discarded on arrival rather than being allowed to
 * overwrite `savedValues` backward with stale data.
 */
export function JournalMetadataEditor({ entry, onDirtyChange, onStatusChange }: JournalMetadataEditorProps) {
    const [values, setValues] = useState<MetadataFormValues>(() => toFormValues(entry));
    const [savedValues, setSavedValues] = useState<MetadataFormValues>(() => toFormValues(entry));
    const [status, setStatus] = useState<SaveStatus>("idle");
    const [errors, setErrors] = useState<UpdateJournalMetadataErrors>({});
    const [, startTransition] = useTransition();
    const saveSeqRef = useRef(0);

    const isDirty = !areValuesEqual(values, savedValues);

    useEffect(() => {
        onDirtyChange?.(isDirty);
    }, [isDirty, onDirtyChange]);

    useEffect(() => {
        onStatusChange?.(status, errors.form);
        // Only the combination that actually changes should re-fire this.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status, errors.form]);

    const handleChange = useCallback((nextValues: MetadataFormValues) => {
        setValues(nextValues);
        setStatus("idle");
        setErrors({});
    }, []);

    const handleSave = useCallback(() => {
        const mySeq = ++saveSeqRef.current;

        startTransition(async () => {
            setStatus("saving");
            setErrors({});

            const result = await updateJournalMetadata({
                id: entry.frontMatter.id,
                ...values,
            });

            if (mySeq !== saveSeqRef.current) {
                return;
            }

            if (result.status === "error") {
                setStatus("error");
                setErrors(result.errors ?? {});
                return;
            }

            setSavedValues(values);
            setStatus("saved");
        });
    }, [entry.frontMatter.id, values]);

    useEffect(() => {
        if (!isDirty) {
            return;
        }

        const timeoutId = setTimeout(handleSave, AUTOSAVE_DEBOUNCE_MS);
        return () => clearTimeout(timeoutId);
        // Re-arms whenever the values themselves change; handleSave is
        // recreated in lockstep with values (see its own deps above), so
        // this always schedules against the current field values.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [values]);

    return (
        <section className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4">
            <h2 className="text-meta font-semibold text-muted-foreground">Details</h2>

            <MetadataPanel
                values={values}
                onChange={handleChange}
                titleError={errors.title}
                journalDateError={errors.journalDate}
            />
        </section>
    );
}
