"use client";

import { FileText, Loader2 } from "lucide-react";
import { useState } from "react";
import { getTemplateAction, listTemplatesAction } from "@/features/template/actions";
import type { TemplateEntry } from "@/features/template/types";
import { applyTemplateVariables } from "@/features/template/variables";

interface InsertTemplateControlProps {
    frontMatter: {
        title: string;
        journalDate: string;
        createdAt: string;
        updatedAt: string;
    };
    onInsert: (content: string) => void;
}

/**
 * Derives the `{{year}}`/`{{month}}`/`{{day}}`/`{{weekday}}` template
 * variables from an ISO "YYYY-MM-DD" journalDate — the same values
 * JournalService derives at creation time. Duplicated here (rather
 * than imported) because that version lives in JournalService.ts,
 * which pulls in the Journal Repository's filesystem access and so
 * isn't safe to import into a Client Component; this is a tiny, pure
 * function, cheap to keep in sync if the format ever changes.
 */
function deriveDateParts(journalDate: string): { year: string; month: string; day: string; weekday: string } {
    const [year, month, day] = journalDate.split("-");
    const weekday = new Date(`${journalDate}T00:00:00Z`).toLocaleDateString("en-US", {
        weekday: "long",
        timeZone: "UTC",
    });

    return { year, month, day, weekday };
}

/**
 * Optional, progressive-disclosure affordance for inserting a
 * template's content into the current (empty) entry — the replacement
 * for what used to be a mandatory template choice in the create-journal
 * dialog. Only rendered by JournalBodyEditor while the entry is still
 * empty (see its own usage), so it never appears as a distraction once
 * there's real content to protect.
 *
 * Selecting a template resolves its `{{...}}` variables against this
 * entry's own front matter and hands the result to `onInsert`, which
 * JournalBodyEditor wires to its normal content-change handler — the
 * inserted text is treated exactly like typed text from that point on,
 * including autosave.
 */
export function InsertTemplateControl({ frontMatter, onInsert }: InsertTemplateControlProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [templates, setTemplates] = useState<TemplateEntry[] | null>(null);
    const [isInserting, setIsInserting] = useState(false);

    function handleOpen() {
        setIsOpen(true);

        if (templates === null) {
            listTemplatesAction().then(setTemplates);
        }
    }

    async function handleSelect(templateId: string) {
        setIsInserting(true);

        const template = await getTemplateAction(templateId);

        if (template) {
            const variables = {
                title: frontMatter.title,
                journalDate: frontMatter.journalDate,
                createdAt: frontMatter.createdAt,
                updatedAt: frontMatter.updatedAt,
                ...deriveDateParts(frontMatter.journalDate),
            };

            onInsert(applyTemplateVariables(template.content, variables));
        }

        setIsInserting(false);
        setIsOpen(false);
    }

    if (!isOpen) {
        return (
            <button
                type="button"
                onClick={handleOpen}
                className="flex items-center gap-1.5 self-start text-body font-medium text-muted-foreground hover:text-accent"
            >
                <FileText className="h-4 w-4" aria-hidden="true" />
                Insert template…
            </button>
        );
    }

    return (
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3">
            {templates === null ? (
                <p className="flex items-center gap-1.5 text-body text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    Loading templates…
                </p>
            ) : (
                <ul className="flex flex-col gap-1">
                    {templates.map((template) => (
                        <li key={template.frontMatter.id}>
                            <button
                                type="button"
                                onClick={() => handleSelect(template.frontMatter.id)}
                                disabled={isInserting}
                                className="w-full rounded px-2 py-1 text-left text-body hover:bg-muted-foreground/10 disabled:opacity-50"
                            >
                                {template.frontMatter.name}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isInserting}
                className="self-start text-meta font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
                Cancel
            </button>
        </div>
    );
}
