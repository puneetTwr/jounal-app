"use client";

import { useActionState, useEffect, useState } from "react";
import { listTemplatesAction } from "@/features/template/actions";
import type { TemplateEntry } from "@/features/template";
import { Skeleton } from "@/components/ui";
import { createJournal, type CreateJournalFormState } from "../actions/createJournal";

const initialState: CreateJournalFormState = { errors: {} };

interface CreateJournalFormProps {
    onCancel: () => void;
}

/** Name matched (case-insensitively) to pick the default template selection. */
const DEFAULT_TEMPLATE_NAME = "blank";

/**
 * Picks which template should be selected by default: the one named
 * "Blank" if it exists, otherwise the first template in the list, or
 * "" if no templates were loaded at all.
 */
function pickDefaultTemplateId(templates: TemplateEntry[]): string {
    const blank = templates.find((template) => template.frontMatter.name.trim().toLowerCase() === DEFAULT_TEMPLATE_NAME);
    return (blank ?? templates[0])?.frontMatter.id ?? "";
}

/**
 * Today's date as a local YYYY-MM-DD string, matching what a `type="date"`
 * input expects. Built from local getters (not `toISOString()`, which is
 * UTC and can land on the wrong day depending on the user's timezone).
 */
function todayAsIsoDate(): string {
    const now = new Date();
    const year = String(now.getFullYear()).padStart(4, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

/**
 * Minimal creation form: title and journal date only. Every other
 * JournalFrontMatter field is generated server-side by
 * JournalService.createJournal() — this form never collects them.
 *
 * Bound directly to the createJournal Server Action via
 * useActionState(), so the form still works as a real HTML submission
 * without client-side JavaScript; isPending only enhances the
 * experience when JS is available.
 */
export function CreateJournalForm({ onCancel }: CreateJournalFormProps) {
    const [state, formAction, isPending] = useActionState(createJournal, initialState);
    const [templates, setTemplates] = useState<TemplateEntry[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState("");
    const [templatesLoaded, setTemplatesLoaded] = useState(false);

    useEffect(() => {
        let cancelled = false;

        listTemplatesAction()
            .then((loadedTemplates) => {
                if (cancelled) return;
                setTemplates(loadedTemplates);
                setSelectedTemplateId(pickDefaultTemplateId(loadedTemplates));
            })
            .finally(() => {
                if (!cancelled) setTemplatesLoaded(true);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <form action={formAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
                <label htmlFor="journal-template" className="text-sm font-medium">
                    Template
                </label>
                {templatesLoaded ? (
                    <select
                        id="journal-template"
                        name="templateId"
                        value={selectedTemplateId}
                        onChange={(event) => setSelectedTemplateId(event.target.value)}
                        disabled={isPending}
                        className="rounded border border-black/20 px-3 py-2 disabled:opacity-50 dark:border-white/20 dark:bg-neutral-900"
                    >
                        {templates.length === 0 && <option value="">No templates available</option>}
                        {templates.map((template) => (
                            <option key={template.frontMatter.id} value={template.frontMatter.id}>
                                {template.frontMatter.name}
                            </option>
                        ))}
                    </select>
                ) : (
                    <>
                        {/* Same footprint as the eventual <select>, so nothing shifts
                            layout when it swaps in — no placeholder option value is
                            ever rendered, only its shape. */}
                        <Skeleton className="h-[42px] w-full" />
                        <input type="hidden" name="templateId" value="" />
                        <span role="status" className="sr-only">
                            Loading templates…
                        </span>
                    </>
                )}
            </div>

            <div className="flex flex-col gap-1">
                <label htmlFor="journal-title" className="text-sm font-medium">
                    Title
                </label>
                <input
                    id="journal-title"
                    name="title"
                    type="text"
                    autoFocus
                    disabled={isPending}
                    placeholder="Defaults to today's date"
                    className="rounded border border-black/20 px-3 py-2 disabled:opacity-50 dark:border-white/20"
                />
            </div>

            <div className="flex flex-col gap-1">
                <label htmlFor="journal-date" className="text-sm font-medium">
                    Journal Date
                </label>
                <input
                    id="journal-date"
                    name="journalDate"
                    type="date"
                    required
                    defaultValue={todayAsIsoDate()}
                    disabled={isPending}
                    aria-invalid={Boolean(state.errors.journalDate)}
                    aria-describedby={state.errors.journalDate ? "journal-date-error" : undefined}
                    className="rounded border border-black/20 px-3 py-2 disabled:opacity-50 dark:border-white/20"
                />
                {state.errors.journalDate && (
                    <p id="journal-date-error" role="alert" className="text-sm text-red-600 dark:text-red-400">
                        {state.errors.journalDate}
                    </p>
                )}
            </div>

            {state.errors.form && (
                <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                    {state.errors.form}
                </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={isPending}
                    className="rounded px-4 py-2 text-sm font-medium hover:bg-black/5 disabled:opacity-50 dark:hover:bg-white/10"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={isPending}
                    className="rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
                >
                    {isPending ? "Creating…" : "Create"}
                </button>
            </div>
        </form>
    );
}
