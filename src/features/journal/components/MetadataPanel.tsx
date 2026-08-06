"use client";

import type { JournalFrontMatter } from "../types";
import { TagsInput } from "./TagsInput";

/**
 * The editable metadata fields, tied directly to JournalFrontMatter via
 * Pick so this can never drift out of sync with the domain type. id,
 * version, and createdAt are deliberately excluded — they're immutable
 * from the UI's perspective.
 */
export type MetadataFormValues = Pick<
    JournalFrontMatter,
    "title" | "journalDate" | "tags" | "favorite" | "pinned" | "archived"
>;

interface MetadataPanelProps {
    values: MetadataFormValues;
    onChange: (values: MetadataFormValues) => void;
    disabled?: boolean;
    titleError?: string;
    journalDateError?: string;
}

/**
 * Presentational metadata form fields: title, journal date, tags, and
 * the three boolean flags. Holds no state and knows nothing about
 * saving — JournalMetadataEditor owns values/dirty-tracking/save,
 * mirroring the MarkdownEditor/JournalBodyEditor split already
 * established for the Markdown body.
 */
export function MetadataPanel({
    values,
    onChange,
    disabled = false,
    titleError,
    journalDateError,
}: MetadataPanelProps) {
    function updateField<K extends keyof MetadataFormValues>(field: K, value: MetadataFormValues[K]) {
        onChange({ ...values, [field]: value });
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
                <label htmlFor="metadata-title" className="text-body font-medium">
                    Title
                </label>
                <input
                    id="metadata-title"
                    type="text"
                    value={values.title}
                    onChange={(event) => updateField("title", event.target.value)}
                    disabled={disabled}
                    aria-invalid={Boolean(titleError)}
                    aria-describedby={titleError ? "metadata-title-error" : undefined}
                    className="rounded border border-border bg-surface px-3 py-2 text-body disabled:opacity-50"
                />
                {titleError && (
                    <p id="metadata-title-error" role="alert" className="text-body text-danger">
                        {titleError}
                    </p>
                )}
            </div>

            <div className="flex flex-col gap-1">
                <label htmlFor="metadata-journal-date" className="text-body font-medium">
                    Journal Date
                </label>
                <input
                    id="metadata-journal-date"
                    type="date"
                    value={values.journalDate}
                    onChange={(event) => updateField("journalDate", event.target.value)}
                    disabled={disabled}
                    aria-invalid={Boolean(journalDateError)}
                    aria-describedby={journalDateError ? "metadata-journal-date-error" : undefined}
                    className="rounded border border-border bg-surface px-3 py-2 text-body disabled:opacity-50"
                />
                {journalDateError && (
                    <p id="metadata-journal-date-error" role="alert" className="text-body text-danger">
                        {journalDateError}
                    </p>
                )}
            </div>

            <TagsInput tags={values.tags} onChange={(tags) => updateField("tags", tags)} disabled={disabled} />

            <fieldset className="flex flex-wrap gap-4">
                <legend className="mb-1 text-body font-medium">Status</legend>
                <label className="flex items-center gap-2 text-body">
                    <input
                        type="checkbox"
                        checked={values.favorite}
                        onChange={(event) => updateField("favorite", event.target.checked)}
                        disabled={disabled}
                    />
                    Favorite
                </label>
                <label className="flex items-center gap-2 text-body">
                    <input
                        type="checkbox"
                        checked={values.pinned}
                        onChange={(event) => updateField("pinned", event.target.checked)}
                        disabled={disabled}
                    />
                    Pinned
                </label>
                <label className="flex items-center gap-2 text-body">
                    <input
                        type="checkbox"
                        checked={values.archived}
                        onChange={(event) => updateField("archived", event.target.checked)}
                        disabled={disabled}
                    />
                    Archived
                </label>
            </fieldset>
        </div>
    );
}
